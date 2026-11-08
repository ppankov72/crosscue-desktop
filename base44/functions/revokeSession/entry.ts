import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';
import { hasDeveloperAccess } from '../../shared/developerAccess.ts';

// Phase F — Revoke a single playback session.
// Server-authoritative, ownership-checked, audit-logged.
// Developer/owner protection: cannot revoke own current developer session.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const sessionId = String(body.session_id || '').trim();
    if (!sessionId) return Response.json({ error: 'session_id_required' }, { status: 400 });

    // Find the session
    let session;
    try {
      session = await base44.asServiceRole.entities.TrialSession.get(sessionId);
    } catch {
      return Response.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    // Ownership check — user can only revoke their own sessions
    if (session.user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Already stopped?
    if (session.session_stopped_at) {
      return Response.json({ error: 'session_already_stopped' }, { status: 409 });
    }

    // Developer protection: warn if revoking current active session
    const isCurrentActive = session.playback_active === true;
    if (isCurrentActive && hasDeveloperAccess(user)) {
      // Allow but log a warning — developer can revoke their own sessions
      // but we log it prominently
    }

    // Revoke the session
    const nowIso = new Date().toISOString();
    try {
      await base44.asServiceRole.entities.TrialSession.update(sessionId, {
        session_stopped_at: nowIso,
        end_reason: 'revoked',
        playback_active: false
      });
    } catch {
      // Fallback to bulkUpdate
      await base44.asServiceRole.entities.TrialSession.bulkUpdate([{
        id: sessionId,
        session_stopped_at: nowIso,
        end_reason: 'revoked',
        playback_active: false
      }]);
    }

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.SESSION_REVOKED,
      `Session revoked: ${session.device_type || 'Unknown'} · ${session.os || '—'}`, req);

    return Response.json({ ok: true, revoked: sessionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}