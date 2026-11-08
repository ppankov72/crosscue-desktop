import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseUA } from '../../shared/trialSystem.ts';

// Phase F — Portal Security Center data aggregation.
// Returns: security events, active sessions, devices — all ownership-enforced.
// Identifies current device by matching request User-Agent.
// Safe projection: no environment_hash, risk_score, raw fingerprint, or full IP.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const userAgent = req.headers.get('user-agent') || '';
    const { device: uaDevice, os: uaOs, browser: uaBrowser } = parseUA(userAgent);

    // 1. Security Events (recent 20)
    let securityEvents = [];
    try {
      const events = await base44.asServiceRole.entities.SecurityEvent.filter({ user_id: userId }, '-created_date', 20);
      securityEvents = events.map(e => ({
        id: e.id,
        event_type: e.event_type || '',
        description: e.description || '',
        device_type: e.device_type || '',
        os: e.os || '',
        browser: e.browser || '',
        created_date: e.created_date || ''
      }));
    } catch {}

    // 2. Devices (installations) — safe projection with current indicator
    let devices = [];
    let currentDeviceId = null;
    try {
      const installations = await base44.asServiceRole.entities.Installation.filter({ first_user_id: userId }, '-last_seen_at', 50);
      devices = installations.map(inst => {
        // Match current device by browser_family + os_family
        const isCurrent = (uaBrowser && uaOs &&
          inst.browser_family === uaBrowser &&
          inst.os_family === uaOs);
        if (isCurrent && !currentDeviceId) currentDeviceId = inst.id;
        return {
          id: inst.id,
          device_type: inst.device_type || 'Unknown',
          os_family: inst.os_family || 'Unknown',
          browser_family: inst.browser_family || 'Unknown',
          first_seen: inst.first_seen_at || inst.created_date || '',
          last_seen: inst.last_seen_at || '',
          timezone: inst.timezone || '',
          language: inst.language || '',
          status: inst.status || 'active',
          revoked_at: inst.revoked_at || '',
          is_current: isCurrent
        };
      });
    } catch {}

    // 3. Sessions (trial sessions) — safe projection with current indicator
    let sessions = [];
    try {
      const allSessions = await base44.asServiceRole.entities.TrialSession.filter({ user_id: userId }, '-created_date', 30);
      sessions = allSessions.map(s => {
        const isActive = s.playback_active === true && !s.session_stopped_at;
        // Current session = active session on current device
        const isCurrent = isActive && currentDeviceId !== null &&
          (s.browser === uaBrowser && s.os === uaOs);
        return {
          id: s.id,
          started: s.session_started_at || s.created_date || '',
          stopped: s.session_stopped_at || '',
          playback_active: isActive,
          device_type: s.device_type || '',
          os: s.os || '',
          browser: s.browser || '',
          end_reason: s.end_reason || '',
          is_current: isCurrent
        };
      });
    } catch {}

    // 4. Active sessions count (for quick display)
    const activeSessionsCount = sessions.filter(s => s.playback_active).length;
    const activeDevicesCount = devices.filter(d => d.status === 'active').length;

    return Response.json({
      securityEvents,
      devices,
      sessions,
      activeSessionsCount,
      activeDevicesCount,
      currentDeviceId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}