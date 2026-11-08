// Server-side session aggregation, Europe/Berlin date range resolution,
// multi-field filtering (AND across fields, OR within field), sorting, pagination, and export formatting.

import { buildXlsxBytes, uint8ToBase64 } from './xlsxBuilder.ts';

export const BERLIN_TZ = 'Europe/Berlin';

// Format a Date or ISO string as YYYY-MM-DD in Europe/Berlin
export function toBerlinDateStr(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BERLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value || '1970';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${day}`;
}

// Format a Date or ISO string as readable Europe/Berlin date-time (YYYY-MM-DD HH:mm:ss)
export function formatBerlinDateTime(dateInput: Date | string): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BERLIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// Convert a YYYY-MM-DD date in Europe/Berlin to exact UTC Date at start (00:00:00.000) or end (23:59:59.999) of day
export function berlinDayBoundaryToUtc(ymd: string, endOfDay = false): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  // Start with a UTC guess at noon on that date to inspect Berlin's UTC offset
  const guess = new Date(Date.UTC(y, m - 1, d, endOfDay ? 21 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0));
  for (let offsetHours = 1; offsetHours <= 3; offsetHours++) {
    const candidate = new Date(
      Date.UTC(
        y,
        m - 1,
        d,
        (endOfDay ? 23 : 0) - offsetHours,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      )
    );
    const berlinYmd = toBerlinDateStr(candidate);
    const berlinHour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: BERLIN_TZ,
        hour: '2-digit',
        hour12: false
      }).format(candidate)
    );
    const targetHour = endOfDay ? 23 : 0;
    if (berlinYmd === ymd && (berlinHour === targetHour || (berlinHour === 24 && targetHour === 0))) {
      return candidate;
    }
  }
  return guess;
}

function shiftBerlinDays(baseYmd: string, deltaDays: number): string {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return toBerlinDateStr(dt);
}

export function resolveBerlinDateRange(params: {
  date_preset?: string;
  start_date?: string;
  end_date?: string;
}) {
  const preset = params?.date_preset || 'all';
  const todayBerlin = toBerlinDateStr(new Date());
  let startYmd = params?.start_date || '';
  let endYmd = params?.end_date || '';

  if (preset === 'today') {
    startYmd = todayBerlin;
    endYmd = todayBerlin;
  } else if (preset === 'yesterday') {
    const yest = shiftBerlinDays(todayBerlin, -1);
    startYmd = yest;
    endYmd = yest;
  } else if (preset === 'last_7_days') {
    startYmd = shiftBerlinDays(todayBerlin, -6);
    endYmd = todayBerlin;
  } else if (preset === 'last_30_days') {
    startYmd = shiftBerlinDays(todayBerlin, -29);
    endYmd = todayBerlin;
  } else if (preset !== 'custom') {
    startYmd = '';
    endYmd = '';
  }

  const startUtc = startYmd ? berlinDayBoundaryToUtc(startYmd, false) : null;
  const endUtc = endYmd ? berlinDayBoundaryToUtc(endYmd, true) : null;

  return {
    preset,
    start_date: startYmd,
    end_date: endYmd,
    startUtc,
    endUtc
  };
}

// Normalize traffic source so admins can filter by specific platforms (Facebook, Instagram, Google, TikTok, YouTube)
// as well as standard categories (Direct, Organic, Social, Referral, Paid, Email).
export function resolveSessionTrafficSource(e: any): {
  traffic_source: string;
  traffic_source_label: string;
  traffic_source_detail: string;
  traffic_tokens: string[];
} {
  const rawCategory = String(e.traffic_source || 'direct').toLowerCase();
  const detail = String(
    e.traffic_source_detail ||
    e.utm_source ||
    e.source ||
    e.first_touch_source ||
    e.referrer ||
    ''
  ).trim();
  const haystack = `${rawCategory} ${detail} ${e.utm_source || ''} ${e.utm_medium || ''} ${e.referrer || ''} ${e.first_touch_source || ''}`.toLowerCase();

  const categoryCap =
    rawCategory === 'organic' ? 'Organic' :
    rawCategory === 'direct' || rawCategory === 'none' ? 'Direct' :
    rawCategory === 'social' ? 'Social' :
    rawCategory === 'referral' ? 'Referral' :
    rawCategory === 'paid' ? 'Paid' :
    rawCategory === 'email' ? 'Email' : 'Direct';

  let platform = '';
  if (haystack.includes('instagram') || haystack.includes('ig')) platform = 'Instagram';
  else if (haystack.includes('facebook') || haystack.includes('fb.com') || haystack.includes('fbclid') || /\bfb\b/.test(haystack)) platform = 'Facebook';
  else if (haystack.includes('tiktok')) platform = 'TikTok';
  else if (haystack.includes('youtube') || haystack.includes('youtu.be')) platform = 'YouTube';
  else if (haystack.includes('linkedin')) platform = 'LinkedIn';
  else if (haystack.includes('reddit')) platform = 'Reddit';
  else if (haystack.includes('twitter') || haystack.includes('x.com')) platform = 'X / Twitter';
  else if (haystack.includes('google')) platform = 'Google';
  else if (haystack.includes('bing')) platform = 'Bing';

  const label = platform
    ? (categoryCap !== 'Social' && categoryCap !== 'Referral' ? `${platform} (${categoryCap})` : platform)
    : categoryCap;

  const tokens = new Set<string>([categoryCap, label]);
  if (platform) tokens.add(platform);
  if (detail) tokens.add(detail);

  return {
    traffic_source: rawCategory === 'none' ? 'direct' : rawCategory,
    traffic_source_label: label,
    traffic_source_detail: detail,
    traffic_tokens: Array.from(tokens)
  };
}

export interface SessionRecord {
  session_id: string;
  created_date: string;
  berlin_datetime: string;
  user: string;
  email: string;
  is_authenticated: boolean;
  ip: string;
  country: string;
  city: string;
  device: string;
  os: string;
  browser: string;
  page: string;
  traffic_source: string;
  traffic_source_label: string;
  traffic_source_detail: string;
  traffic_tokens: string[];
  traffic_class: string;
  classification_reason: string;
  events_count: number;
  real_events_count: number;
  excluded_events_count: number;
}

// Aggregate all classified events into full SessionRecord objects without any 100-session cap
export function buildSessionsFromEvents(events: any[]): SessionRecord[] {
  const sessionMap = new Map<string, SessionRecord>();

  for (const e of events) {
    const sid = e.session_id;
    if (!sid || sid === 'unknown') continue;

    const existing = sessionMap.get(sid);
    const tsInfo = resolveSessionTrafficSource(e);
    const isReal = (e.traffic_class || 'real') === 'real';
    const userDisplay = e.is_authenticated && e.email ? e.email : (e.email || 'anonymous');

    if (!existing) {
      sessionMap.set(sid, {
        session_id: sid,
        created_date: e.created_date,
        berlin_datetime: formatBerlinDateTime(e.created_date),
        user: userDisplay,
        email: e.email || '',
        is_authenticated: Boolean(e.is_authenticated),
        ip: e.ip || '—',
        country: e.country || '—',
        city: e.city || '—',
        device: e.device || '—',
        os: e.os || '—',
        browser: e.browser || '—',
        page: e.page || '—',
        traffic_source: tsInfo.traffic_source,
        traffic_source_label: tsInfo.traffic_source_label,
        traffic_source_detail: tsInfo.traffic_source_detail,
        traffic_tokens: tsInfo.traffic_tokens,
        traffic_class: e.traffic_class || 'real',
        classification_reason: e.classification_reason || '',
        events_count: 1,
        real_events_count: isReal ? 1 : 0,
        excluded_events_count: isReal ? 0 : 1
      });
    } else {
      existing.events_count++;
      if (isReal) existing.real_events_count++;
      else existing.excluded_events_count++;

      // Merge traffic tokens if an earlier event in the session carried the landing referrer/UTM
      for (const tok of tsInfo.traffic_tokens) {
        if (!existing.traffic_tokens.includes(tok)) {
          existing.traffic_tokens.push(tok);
        }
      }
      if (existing.traffic_source_label === 'Direct' && tsInfo.traffic_source_label !== 'Direct') {
        existing.traffic_source = tsInfo.traffic_source;
        existing.traffic_source_label = tsInfo.traffic_source_label;
        existing.traffic_source_detail = tsInfo.traffic_source_detail;
      }

      // Keep the latest timestamp and latest page/context attributes
      if (new Date(e.created_date) > new Date(existing.created_date)) {
        existing.created_date = e.created_date;
        existing.berlin_datetime = formatBerlinDateTime(e.created_date);
        if (e.is_authenticated && e.email) {
          existing.user = e.email;
          existing.email = e.email;
          existing.is_authenticated = true;
        }
        if (e.ip) existing.ip = e.ip;
        if (e.country) existing.country = e.country;
        if (e.city) existing.city = e.city;
        if (e.device) existing.device = e.device;
        if (e.os) existing.os = e.os;
        if (e.browser) existing.browser = e.browser;
        if (e.page) existing.page = e.page;
      }
      // If any event in the session is non-real, reflect the highest priority non-real class
      if (existing.traffic_class === 'real' && e.traffic_class && e.traffic_class !== 'real') {
        existing.traffic_class = e.traffic_class;
        existing.classification_reason = e.classification_reason || existing.classification_reason;
      }
    }
  }

  return Array.from(sessionMap.values());
}

const DEFAULT_TRAFFIC_SOURCE_OPTIONS = [
  'Direct',
  'Organic',
  'Facebook',
  'Instagram',
  'Google',
  'Social',
  'Referral',
  'Paid',
  'Email',
  'YouTube',
  'TikTok'
];

export function computeSessionFacets(sessions: SessionRecord[]) {
  const collect = (getter: (s: SessionRecord) => string | string[]) => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const raw = getter(s);
      const vals = Array.isArray(raw) ? raw : [raw];
      for (const v of vals) {
        const clean = String(v || '').trim();
        if (!clean) continue;
        counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };

  const tsCounts = new Map<string, number>();
  for (const preset of DEFAULT_TRAFFIC_SOURCE_OPTIONS) {
    tsCounts.set(preset, 0);
  }
  for (const s of sessions) {
    const matched = new Set<string>([s.traffic_source_label, ...s.traffic_tokens]);
    for (const tok of matched) {
      const clean = String(tok || '').trim();
      if (!clean) continue;
      tsCounts.set(clean, (tsCounts.get(clean) || 0) + 1);
    }
  }
  const trafficSources = Array.from(tsCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    country: collect(s => s.country),
    city: collect(s => s.city),
    device: collect(s => s.device),
    os: collect(s => s.os),
    browser: collect(s => s.browser),
    page: collect(s => s.page),
    user: collect(s => s.user),
    traffic_source: trafficSources
  };
}

function normalizeArrayFilter(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return [];
}

// Apply multi-field filters (AND between fields, OR between selected values within a field) and search
export function filterSessions(
  sessions: SessionRecord[],
  filters: Record<string, unknown> = {},
  search = ''
): SessionRecord[] {
  const countries = normalizeArrayFilter(filters.country);
  const cities = normalizeArrayFilter(filters.city);
  const devices = normalizeArrayFilter(filters.device);
  const osList = normalizeArrayFilter(filters.os);
  const browsers = normalizeArrayFilter(filters.browser);
  const pages = normalizeArrayFilter(filters.page);
  const users = normalizeArrayFilter(filters.user);
  const trafficSources = normalizeArrayFilter(filters.traffic_source);
  const q = String(search || '').trim().toLowerCase();

  return sessions.filter(s => {
    if (countries.length > 0 && !countries.includes(s.country)) return false;
    if (cities.length > 0 && !cities.includes(s.city)) return false;
    if (devices.length > 0 && !devices.includes(s.device)) return false;
    if (osList.length > 0 && !osList.includes(s.os)) return false;
    if (browsers.length > 0 && !browsers.includes(s.browser)) return false;
    if (pages.length > 0 && !pages.includes(s.page)) return false;

    if (users.length > 0) {
      const userMatched = users.some(u => {
        if (u === 'anonymous') return !s.is_authenticated || s.user === 'anonymous';
        if (u === 'authenticated') return s.is_authenticated;
        return s.user.toLowerCase() === u.toLowerCase();
      });
      if (!userMatched) return false;
    }

    if (trafficSources.length > 0) {
      const sourceMatched = trafficSources.some(ts => {
        const target = ts.toLowerCase();
        return (
          s.traffic_source_label.toLowerCase() === target ||
          s.traffic_source.toLowerCase() === target ||
          s.traffic_tokens.some(t => t.toLowerCase() === target)
        );
      });
      if (!sourceMatched) return false;
    }

    if (q) {
      const hay = [
        s.session_id,
        s.user,
        s.email,
        s.ip,
        s.country,
        s.city,
        s.device,
        s.os,
        s.browser,
        s.page,
        s.traffic_source_label,
        s.traffic_source,
        s.traffic_source_detail,
        s.traffic_class,
        s.berlin_datetime
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function sortSessions(
  sessions: SessionRecord[],
  sortBy = 'created_date',
  sortDir = 'desc'
): SessionRecord[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  const sorted = [...sessions];

  sorted.sort((a, b) => {
    if (sortBy === 'created_date') {
      const ta = new Date(a.created_date).getTime() || 0;
      const tb = new Date(b.created_date).getTime() || 0;
      return (ta - tb) * dir;
    }
    const keyMap: Record<string, keyof SessionRecord> = {
      user: 'user',
      ip: 'ip',
      country: 'country',
      city: 'city',
      device: 'device',
      os: 'os',
      browser: 'browser',
      page: 'page',
      traffic_source: 'traffic_source_label',
      session_id: 'session_id',
      traffic_class: 'traffic_class'
    };
    const field = keyMap[sortBy] || 'created_date';
    const va = String(a[field] ?? '');
    const vb = String(b[field] ?? '');
    const cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp * dir;
    return ((new Date(b.created_date).getTime() || 0) - (new Date(a.created_date).getTime() || 0));
  });

  return sorted;
}

export const EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'created_date', label: 'Date / Time (Europe/Berlin)' },
  { key: 'user', label: 'User' },
  { key: 'ip', label: 'IP' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'device', label: 'Device' },
  { key: 'os', label: 'OS' },
  { key: 'browser', label: 'Browser' },
  { key: 'page', label: 'Page' },
  { key: 'traffic_source', label: 'Traffic Source' },
  { key: 'traffic_class', label: 'Traffic Class' },
  { key: 'session_id', label: 'Session ID' }
];

export function buildExportPayload(
  sessions: SessionRecord[],
  format: 'csv' | 'xlsx',
  visibleColumns?: string[]
) {
  // Always include all selected visible columns, and guarantee full Session ID is present
  const selectedCols = Array.isArray(visibleColumns) && visibleColumns.length > 0
    ? EXPORT_COLUMNS.filter(c => visibleColumns.includes(c.key) || c.key === 'session_id')
    : EXPORT_COLUMNS;

  const headers = selectedCols.map(c => c.label);
  const rows = sessions.map(s =>
    selectedCols.map(c => {
      if (c.key === 'created_date') return s.berlin_datetime || formatBerlinDateTime(s.created_date);
      if (c.key === 'traffic_source') {
        return s.traffic_source_detail && !s.traffic_source_label.toLowerCase().includes(s.traffic_source_detail.toLowerCase())
          ? `${s.traffic_source_label} (${s.traffic_source_detail})`
          : s.traffic_source_label;
      }
      if (c.key === 'session_id') return s.session_id; // Full session ID always!
      return String((s as any)[c.key] ?? '');
    })
  );

  if (format === 'xlsx') {
    const bytes = buildXlsxBytes(headers, rows);
    return {
      format: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: uint8ToBase64(bytes),
      rowCount: rows.length
    };
  }

  // CSV with UTF-8 BOM for Excel compatibility
  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(r => r.map(escapeCsv).join(','))
  ];
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  return {
    format: 'csv',
    mimeType: 'text/csv;charset=utf-8;',
    csv: csvContent,
    rowCount: rows.length
  };
}