import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sessions = await base44.asServiceRole.entities.SessionLog.list('-created_date', 1000);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const uniqueEmails = new Set(sessions.map(s => s.email || 'anonymous'));
    const sessionsToday = sessions.filter(s => new Date(s.created_date) >= todayStart).length;
    const sessionsThisWeek = sessions.filter(s => new Date(s.created_date) >= weekStart).length;

    const dayMap = {};
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    sessions.forEach(s => {
      const d = new Date(s.created_date);
      if (d >= last30) {
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = (dayMap[key] || 0) + 1;
      }
    });
    const activity = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      activity.push({ date: key, sessions: dayMap[key] || 0 });
    }

    const countryMap = {}, cityMap = {}, markerMap = {};
    sessions.forEach(s => {
      if (s.country) countryMap[s.country] = (countryMap[s.country] || 0) + 1;
      if (s.city) cityMap[s.city] = (cityMap[s.city] || 0) + 1;
      if (s.latitude && s.longitude) {
        const key = `${s.latitude},${s.longitude}`;
        if (!markerMap[key]) markerMap[key] = { lat: s.latitude, lon: s.longitude, city: s.city, country: s.country, count: 0 };
        markerMap[key].count++;
      }
    });
    const topCountries = Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topCities = Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const markers = Object.values(markerMap);

    const deviceMap = {}, osMap = {}, browserMap = {};
    sessions.forEach(s => {
      if (s.device) deviceMap[s.device] = (deviceMap[s.device] || 0) + 1;
      if (s.os) osMap[s.os] = (osMap[s.os] || 0) + 1;
      if (s.browser) browserMap[s.browser] = (browserMap[s.browser] || 0) + 1;
    });
    const toArr = m => Object.entries(m).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

    const recentSessions = sessions.slice(0, 200).map(s => ({
      id: s.id,
      email: s.email,
      ip: s.ip,
      country: s.country,
      city: s.city,
      device: s.device,
      os: s.os,
      browser: s.browser,
      screenResolution: s.screenResolution,
      page: s.page,
      created_date: s.created_date
    }));

    return Response.json({
      overview: {
        totalSessions: sessions.length,
        uniqueVisitors: uniqueEmails.size,
        sessionsToday,
        sessionsThisWeek
      },
      activity,
      geo: { topCountries, topCities, markers },
      devices: {
        device: toArr(deviceMap),
        os: toArr(osMap),
        browser: toArr(browserMap)
      },
      recentSessions
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}