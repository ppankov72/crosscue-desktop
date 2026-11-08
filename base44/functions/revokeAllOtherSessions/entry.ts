import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';
import { parseUA } from '../../shared/trialSystem.ts';

// Phase F — Revoke all other active playback sessions (not the current one).
// Server-authoritative, ownership-checked, audit-logged.
// Current session is identified by matching request User-Agent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userAgent = req.headers.get('user-agent') || '';
    const { os: uaOs, browser: uaBrowser } = parseUA(userAgent);

    // Find all active sessions for this user
    const sessions = await base44.asServiceRole.entities.TrialSession.filter({ user_id: user.id }, '-created_date', 100);

    // Filter to active sessions only
    const activeSessions = sessions.filter(s => s.playback_active === true && !s.session_stopped_at);

    if (activeSessions.length === 0) {
      return Response.json({ ok: true, revoked_count: 0, message: 'no_active_sessions' });
    }

    // Identify current session (matching UA) — don't revoke it
    const nowIso = new Date().toISOString();
    const toRevoke = [];

    for (const s of activeSessions) {
      const isCurrent = (s.browser === uaBrowser && s.os === uaOs);
      if (!isCurrent) {
        toRevoke.push({
          id: s.id,
          session_stopped_at: nowIso,
          end_reason: 'revoked',
          playback_active: false
        });
      }
    }

    if (toRevoke.length === 0) {
      return Response.json({ ok: true, revoked_count: 0, message: 'only_current_session' });
    }

    // Bulk revoke
    try {
      await base44.asServiceRole.entities.TrialSession.bulkUpdate(toRevoke);
    } catch {
      // Fallback: update one by one
      for (const update of toRevoke) {
        try {
          await base44.asServiceRole.entities.TrialSession.update(update.id, {
            session_stopped_at: update.session_stopped_at,
            end_reason: update.end_reason,
            playback_active: false
          });
        } catch {}
      }
    }

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.SESSION_REVOKED_ALL,
      `Revoked ${toRevoke.length} other session(s)`, req);

    return Response.json({ ok: true, revoked_count: toRevoke.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}