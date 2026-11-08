import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Phase E — Get the authenticated user's own devices and sessions.
// Server-side ownership enforced — user A cannot see user B's devices.
// Safe projection: no environment hash, risk score, raw fingerprint, or full IP.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's own installations
    const installations = await base44.asServiceRole.entities.Installation.filter({ first_user_id: user.id }, '-last_seen_at', 50);

    const safeDevices = installations.map(inst => ({
      id: inst.id,
      device_type: inst.device_type || 'Unknown',
      os_family: inst.os_family || 'Unknown',
      browser_family: inst.browser_family || 'Unknown',
      first_seen: inst.first_seen_at || inst.created_date || '',
      last_seen: inst.last_seen_at || '',
      timezone: inst.timezone || '',
      language: inst.language || ''
      // NOT exposed: environment_hash, risk_score, flagged, first_ip, last_ip, installation_id
    }));

    // Get user's own trial sessions (playback sessions, NOT auth sessions)
    const sessions = await base44.asServiceRole.entities.TrialSession.filter({ user_id: user.id }, '-created_date', 20);

    const safeSessions = sessions.map(s => ({
      id: s.id,
      started: s.session_started_at || s.created_date || '',
      stopped: s.session_stopped_at || '',
      playback_active: s.playback_active || false,
      device_type: s.device_type || '',
      os: s.os || '',
      browser: s.browser || '',
      end_reason: s.end_reason || ''
      // NOT exposed: ip, country, city, latitude, longitude, user_agent, shadow_enforcement_decision
    }));

    return Response.json({ devices: safeDevices, sessions: safeSessions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}