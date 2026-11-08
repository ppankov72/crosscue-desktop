import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { trafficContext, classificationFor, trafficMeta, entityPages } from '../../shared/trafficClassifier.ts';
import {
  resolveBerlinDateRange,
  buildSessionsFromEvents,
  computeSessionFacets,
  filterSessions,
  sortSessions,
  buildExportPayload,
  toBerlinDateStr
} from '../../shared/sessionsAnalytics.ts';

// Analytics V2 — separates visitors, sessions, pageviews, and events.
// Supports server-side filtering, sorting, pagination, and CSV/XLSX export for Recent Visitors / Sessions
// without fixed 5,000-event or 100-session caps.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const filter = ['all', 'real', 'compare'].includes(body.traffic_filter) ? body.traffic_filter : 'real';
    const mode = body.mode || 'dashboard'; // 'dashboard' | 'sessions' | 'export'

    const dateRange = resolveBerlinDateRange({
      date_preset: body.date_preset,
      start_date: body.start_date,
      end_date: body.end_date
    });

    // For 'sessions' and 'export' modes with a date filter, push date boundaries to the entity query
    const eventQuery: Record<string, any> = {};
    if ((mode === 'sessions' || mode === 'export') && (dateRange.startUtc || dateRange.endUtc)) {
      eventQuery.created_date = {};
      if (dateRange.startUtc) eventQuery.created_date.$gte = dateRange.startUtc.toISOString();
      if (dateRange.endUtc) eventQuery.created_date.$lte = dateRange.endUtc.toISOString();
    }

    const rawEvents: any[] = [];
    for await (const page of entityPages(base44.asServiceRole.entities.AnalyticsEvent, eventQuery)) {
      rawEvents.push(...page);
    }

    const context = await trafficContext(base44);
    const allEvents = rawEvents.map(e => ({ ...e, ...classificationFor(e, context) }));

    // Filter events by Europe/Berlin date range for sessions processing
    const periodAllEvents = (dateRange.startUtc || dateRange.endUtc)
      ? allEvents.filter(e => {
          const t = new Date(e.created_date).getTime();
          if (Number.isNaN(t)) return false;
          if (dateRange.startUtc && t < dateRange.startUtc.getTime()) return false;
          if (dateRange.endUtc && t > dateRange.endUtc.getTime()) return false;
          return true;
        })
      : allEvents;

    // Build all sessions in the selected period (all traffic classes)
    const allPeriodSessions = buildSessionsFromEvents(periodAllEvents);
    const realPeriodSessions = allPeriodSessions.filter(s => s.traffic_class === 'real');

    // In 'real' mode, base sessions are real sessions; in 'all' or 'compare' mode, base sessions include all classes
    // (and in 'compare' mode we also compute separate real vs excluded breakdowns).
    const activeBaseSessions = filter === 'real' ? realPeriodSessions : allPeriodSessions;

    const sortBy = body.sort_by || 'created_date';
    const sortDir = body.sort_dir === 'asc' ? 'asc' : 'desc';
    const pageNum = Math.max(1, Number(body.page) || 1);
    const pageSize = Math.min(500, Math.max(10, Number(body.page_size) || 25));
    const fieldFilters = body.filters || {};
    const searchQuery = String(body.search || '');

    // --- Export Mode ---
    if (mode === 'export') {
      const exportScope = body.export_scope === 'all' ? 'all' : 'filtered';
      const format = body.format === 'xlsx' ? 'xlsx' : 'csv';

      const targetSessions = exportScope === 'all'
        ? activeBaseSessions
        : filterSessions(activeBaseSessions, fieldFilters, searchQuery);

      const sortedExportSessions = sortSessions(targetSessions, sortBy, sortDir);
      const exportPayload = buildExportPayload(sortedExportSessions, format, body.visible_columns);

      return Response.json({
        ...exportPayload,
        export_scope: exportScope,
        traffic_filter: filter,
        date_range: {
          preset: dateRange.preset,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        }
      });
    }

    // --- Compute Sessions Table Data (Facets, Filtering, Compare Breakdown, Sorting, Pagination) ---
    const buildSessionsResponse = () => {
      const facets = computeSessionFacets(activeBaseSessions);
      const filteredActive = filterSessions(activeBaseSessions, fieldFilters, searchQuery);
      const sortedActive = sortSessions(filteredActive, sortBy, sortDir);

      // Compare breakdown across ALL period sessions matching the current field filters & search
      const filteredAllClasses = filter === 'real'
        ? filterSessions(allPeriodSessions, fieldFilters, searchQuery)
        : filteredActive;

      const byClass = { real: 0, internal: 0, test: 0, bot: 0 };
      for (const s of filteredAllClasses) {
        const cls = (s.traffic_class || 'real') as keyof typeof byClass;
        if (byClass[cls] !== undefined) byClass[cls]++;
        else byClass.real++;
      }
      const compareSummary = {
        allTotal: filteredAllClasses.length,
        realTotal: byClass.real,
        excludedTotal: byClass.internal + byClass.test + byClass.bot,
        byClass,
        periodAllTotal: allPeriodSessions.length,
        periodRealTotal: realPeriodSessions.length,
        periodExcludedTotal: allPeriodSessions.length - realPeriodSessions.length
      };

      const total = sortedActive.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(pageNum, totalPages);
      const startIdx = (safePage - 1) * pageSize;
      const items = sortedActive.slice(startIdx, startIdx + pageSize);

      return {
        items,
        total,
        unfilteredPeriodTotal: activeBaseSessions.length,
        page: safePage,
        pageSize,
        totalPages,
        sortBy,
        sortDir,
        dateRange: {
          preset: dateRange.preset,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        },
        facets,
        compareSummary
      };
    };

    const sessionsData = buildSessionsResponse();

    if (mode === 'sessions') {
      return Response.json({
        sessionsData,
        traffic: trafficMeta(periodAllEvents, filter)
      });
    }

    // --- Full Dashboard Mode ---
    const realEvents = allEvents.filter(e => e.traffic_class === 'real');

    const aggregate = (events: any[]) => {
      const todayBerlin = toBerlinDateStr(new Date());
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);

      // --- Overview ---
      const uniqueVisitors = new Set(events.map(e => e.installation_id));
      const uniqueSessions = new Set(events.map(e => e.session_id));
      const pageviews = events.filter(e => e.event_type === 'pageview');
      const sessionsToday = new Set(events.filter(e => toBerlinDateStr(e.created_date) === todayBerlin).map(e => e.session_id));
      const visitorsToday = new Set(events.filter(e => toBerlinDateStr(e.created_date) === todayBerlin).map(e => e.installation_id));
      const trialUsers = new Set(events.filter(e => e.is_trial_user).map(e => e.installation_id));
      const authedUsers = new Set(events.filter(e => e.is_authenticated).map(e => e.installation_id));

      // --- Activity (30-day in Europe/Berlin) ---
      const dayMap: Record<string, { visitors: Set<string>; sessions: Set<string>; pageviews: number }> = {};
      events.forEach(e => {
        const d = new Date(e.created_date);
        if (d >= last30) {
          const key = toBerlinDateStr(d);
          if (!dayMap[key]) dayMap[key] = { visitors: new Set(), sessions: new Set(), pageviews: 0 };
          dayMap[key].visitors.add(e.installation_id);
          dayMap[key].sessions.add(e.session_id);
          if (e.event_type === 'pageview') dayMap[key].pageviews++;
        }
      });
      const activity = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = toBerlinDateStr(d);
        const day = dayMap[key];
        activity.push({
          date: key,
          visitors: day ? day.visitors.size : 0,
          sessions: day ? day.sessions.size : 0,
          pageviews: day ? day.pageviews : 0
        });
      }

      // --- Traffic Sources ---
      const trafficMap: Record<string, { source: string; detail: string; visitors: Set<string>; sessions: Set<string>; pageviews: number }> = {};
      events.forEach(e => {
        const src = e.traffic_source || 'none';
        const detail = e.traffic_source_detail || '';
        const key = `${src}|${detail}`;
        if (!trafficMap[key]) trafficMap[key] = { source: src, detail, visitors: new Set(), sessions: new Set(), pageviews: 0 };
        trafficMap[key].visitors.add(e.installation_id);
        trafficMap[key].sessions.add(e.session_id);
        if (e.event_type === 'pageview') trafficMap[key].pageviews++;
      });
      const trafficSources = Object.values(trafficMap)
        .map(t => ({ source: t.source, detail: t.detail, visitors: t.visitors.size, sessions: t.sessions.size, pageviews: t.pageviews }))
        .sort((a, b) => b.visitors - a.visitors);

      // --- Event Types ---
      const eventMap: Record<string, number> = {};
      events.forEach(e => {
        const t = e.event_type || 'custom';
        eventMap[t] = (eventMap[t] || 0) + 1;
      });
      const eventTypes = Object.entries(eventMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // --- Geo ---
      const countryMap: Record<string, number> = {}, cityMap: Record<string, number> = {}, markerMap: Record<string, any> = {};
      events.forEach(e => {
        if (e.country) countryMap[e.country] = (countryMap[e.country] || 0) + 1;
        if (e.city) cityMap[e.city] = (cityMap[e.city] || 0) + 1;
        if (e.latitude && e.longitude) {
          const key = `${e.latitude},${e.longitude}`;
          if (!markerMap[key]) markerMap[key] = { lat: e.latitude, lon: e.longitude, city: e.city, country: e.country, count: 0 };
          markerMap[key].count++;
        }
      });
      const topCountries = Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);
      const topCities = Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 10);
      const markers = Object.values(markerMap);

      // --- Devices ---
      const deviceMap: Record<string, number> = {}, osMap: Record<string, number> = {}, browserMap: Record<string, number> = {};
      events.forEach(e => {
        if (e.device) deviceMap[e.device] = (deviceMap[e.device] || 0) + 1;
        if (e.os) osMap[e.os] = (osMap[e.os] || 0) + 1;
        if (e.browser) browserMap[e.browser] = (browserMap[e.browser] || 0) + 1;
      });
      const toArr = (m: Record<string, number>) => Object.entries(m).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

      return {
        overview: {
          totalVisitors: uniqueVisitors.size,
          totalSessions: uniqueSessions.size,
          totalPageviews: pageviews.length,
          totalEvents: events.length,
          visitorsToday: visitorsToday.size,
          sessionsToday: sessionsToday.size,
          trialUsers: trialUsers.size,
          authenticatedUsers: authedUsers.size
        },
        activity,
        trafficSources,
        eventTypes,
        geo: { topCountries, topCities, markers },
        devices: {
          device: toArr(deviceMap),
          os: toArr(osMap),
          browser: toArr(browserMap)
        },
        recentVisitors: sessionsData.items
      };
    };

    const result = aggregate(filter === 'all' ? allEvents : realEvents);
    return Response.json({
      ...result,
      sessionsData,
      traffic: trafficMeta(allEvents, filter),
      comparison: filter === 'compare' ? { all: aggregate(allEvents), real: result } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}