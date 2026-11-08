// TEMPORARY diagnostic probe — admin-only.
// Returns ONLY IP-related request headers so the owner can compare
// a real crosscue.de browser request against the Base44 test runner.
// Does NOT touch the database, does NOT log other headers, does NOT
// expose cookies, Authorization, OAuth tokens, or any non-IP header.
// Safe to delete after the diagnostic is complete.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getClientIp } from '../../shared/trialSystem.ts';

// Strict allowlist — only forwarded/client-IP headers. Nothing else.
const IP_HEADERS = [
  'cf-connecting-ip',
  'x-forwarded-for',
  'x-real-ip',
  'true-client-ip',
  'x-client-ip',
  'forwarded',
  // Other known platform/CDN client-IP headers to detect
  'x-cluster-client-ip',
  'x-forwarded',
  'cf-pseudo-ipv4',
  'cf-ipv4',
  'fastly-client-ip',
  'x-akamai-edgescape',
  'x-vercel-forwarded-for',
  'x-original-forwarded-for'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const headers = req.headers;

    // Snapshot ONLY the allowlisted headers. Present/absent + raw value.
    const inspected = {};
    for (const name of IP_HEADERS) {
      const raw = headers.get(name);
      inspected[name] = raw === null
        ? { present: false, rawValue: null }
        : { present: true, rawValue: raw };
    }

    // Current production resolution (unchanged logic, just reported)
    const currentClientIp = getClientIp(headers);

    return Response.json({
      diagnostic: 'client-ip-headers',
      triggeredBy: { id: user.id, email: user.email, role: user.role },
      timestamp: new Date().toISOString(),
      inspectedHeaders: inspected,
      getClientIpResult: currentClientIp,
      note: 'Only IP-related headers are reported. Cookies, Authorization, and all other headers are intentionally excluded.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}