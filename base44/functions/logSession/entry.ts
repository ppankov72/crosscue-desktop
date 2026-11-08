import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseUA, getClientIp, getGeoFromIp } from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let email = 'anonymous';
    try {
      const user = await base44.auth.me();
      if (user?.email) email = user.email;
    } catch {}

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { device, os, browser } = parseUA(userAgent);
    const ip = getClientIp(req.headers);

    let body = {};
    try { body = await req.json(); } catch {}
    const screenResolution = body.screenResolution || '';
    const page = body.page || '/';

    const geo = await getGeoFromIp(ip);

    await base44.asServiceRole.entities.SessionLog.create({
      email,
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      device,
      os,
      browser,
      screenResolution,
      userAgent,
      page
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}