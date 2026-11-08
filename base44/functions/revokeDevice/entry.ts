import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';
import { parseUA } from '../../shared/trialSystem.ts';

// Phase F — Revoke a device (installation).
// Server-authoritative, ownership-checked, audit-logged.
// Also revokes all active sessions on that device.
// Developer protection: cannot revoke the current device (identified by UA match).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const deviceId = String(body.device_id || '').trim();
    if (!deviceId) return Response.json({ error: 'device_id_required' }, { status: 400 });

    // Find the installation
    let installation;
    try {
      installation = await base44.asServiceRole.entities.Installation.get(deviceId);
    } catch {
      return Response.json({ error: 'DEVICE_NOT_FOUND' }, { status: 404 });
    }

    // Ownership check — user can only revoke their own devices
    if (installation.first_user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Already revoked?
    if (installation.status === 'revoked') {
      return Response.json({ error: 'device_already_revoked' }, { status: 409 });
    }

    // Protect current device — cannot revoke the device making the request
    const userAgent = req.headers.get('user-agent') || '';
    const { os: uaOs, browser: uaBrowser } = parseUA(userAgent);
    const isCurrentDevice = (installation.browser_family === uaBrowser && installation.os_family === uaOs);
    if (isCurrentDevice) {
      return Response.json({ error: 'cannot_revoke_current_device' }, { status: 409 });
    }

    // Revoke the installation
    const nowIso = new Date().toISOString();
    try {
      await base44.asServiceRole.entities.Installation.update(deviceId, {
        status: 'revoked',
        revoked_at: nowIso
      });
    } catch {
      await base44.asServiceRole.entities.Installation.bulkUpdate([{
        id: deviceId,
        status: 'revoked',
        revoked_at: nowIso
      }]);
    }

    // Also revoke all active sessions on this device (matching browser_family + os_family)
    try {
      const sessions = await base44.asServiceRole.entities.TrialSession.filter({ user_id: user.id }, '-created_date', 100);
      const activeOnDevice = sessions.filter(s =>
        s.playback_active === true &&
        !s.session_stopped_at &&
        s.browser === installation.browser_family &&
        s.os === installation.os_family
      );

      if (activeOnDevice.length > 0) {
        const updates = activeOnDevice.map(s => ({
          id: s.id,
          session_stopped_at: nowIso,
          end_reason: 'device_revoked',
          playback_active: false
        }));
        try {
          await base44.asServiceRole.entities.TrialSession.bulkUpdate(updates);
        } catch {}
      }
    } catch {}

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.DEVICE_REVOKED,
      `Device revoked: ${installation.device_type || 'Unknown'} · ${installation.os_family || '—'} · ${installation.browser_family || '—'}`, req);

    return Response.json({ ok: true, revoked: deviceId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}