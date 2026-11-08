import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';

// Phase E — Update MYFEED link settings (share_activity_enabled toggle).
// Server-side ownership enforced.
// Phase F — logs SECURITY_SETTING_CHANGED event.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const shareActivityEnabled = Boolean(body.share_activity_enabled);

    // Find the user's link record
    const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id }, '-created_date', 1);
    if (links.length === 0) {
      return Response.json({ error: 'no_link' }, { status: 404 });
    }

    await base44.asServiceRole.entities.MyFeedLink.update(links[0].id, {
      share_activity_enabled: shareActivityEnabled
    });

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.SECURITY_SETTING_CHANGED,
      `Activity sharing ${shareActivityEnabled ? 'enabled' : 'disabled'}`, req);

    return Response.json({ ok: true, share_activity_enabled: shareActivityEnabled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}