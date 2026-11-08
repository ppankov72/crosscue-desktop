import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { unlinkIdentity } from '../../shared/myFeedConnector.ts';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';

// Phase E — Unlink MYFEED identity.
// Terminates the integration link only.
// Does NOT delete CROSSCUE account, MYFEED account, DJ profile, Trial, or Premium.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the active link for this user
    const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'linked' }, '-created_date', 1);
    if (links.length === 0) {
      return Response.json({ error: 'not_linked' }, { status: 404 });
    }

    const link = links[0];
    const nowIso = new Date().toISOString();

    // Call MYFEED API to unlink (best effort — don't block if MYFEED is down)
    try {
      await unlinkIdentity(user.id);
    } catch {
      // Even if MYFEED API fails, we mark as unlinked locally
    }

    // Update link record to 'unlinked'
    await base44.asServiceRole.entities.MyFeedLink.update(link.id, {
      status: 'unlinked',
      unlinked_at: nowIso,
      last_status: 'unlinked',
      last_sync_at: nowIso,
      myfeed_user_id: '',
      myfeed_display_name: '',
      myfeed_avatar_url: '',
      myfeed_profile_url: '',
      share_activity_enabled: false
    });

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.MYFEED_UNLINKED,
      'MYFEED unlinked', req);

    return Response.json({ ok: true, status: 'unlinked' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}