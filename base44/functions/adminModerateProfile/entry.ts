import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin/MC profile moderation.
// Actions: hide, restore.
// Only admin-level roles can moderate. DJ cannot self-unmoderate.
// All actions logged to AdminAuditLog.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const customRole = (user as any).custom_role || 'member';
    const isAdmin = ['owner', 'super_admin', 'admin', 'moderator'].includes(customRole);
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || '';
    const profileId = body.profileId || '';
    const reason = body.reason || '';

    if (!action || !profileId) {
      return Response.json({ error: 'action and profileId required' }, { status: 400 });
    }

    if (!['hide', 'restore'].includes(action)) {
      return Response.json({ error: 'invalid_action' }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.DjProfile.get(profileId);
    if (!profile) return Response.json({ error: 'profile_not_found' }, { status: 404 });

    const nowIso = new Date().toISOString();
    const oldValue = { moderation_status: profile.moderation_status || 'active' };
    let newValue: any = {};

    if (action === 'hide') {
      newValue = { moderation_status: 'hidden', moderated_by: user.id, moderated_at: nowIso, moderation_reason: reason || 'admin_moderation' };
    } else if (action === 'restore') {
      newValue = { moderation_status: 'active', moderated_by: user.id, moderated_at: nowIso, moderation_reason: '' };
    }

    try {
      await base44.asServiceRole.entities.DjProfile.update(profileId, newValue);
    } catch {
      await base44.asServiceRole.entities.DjProfile.bulkUpdate([{ id: profileId, ...newValue }]);
    }

    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_user_id: user.id,
      admin_email: user.email,
      action: `profile_${action}`,
      target_type: 'dj_profile',
      target_id: profileId,
      old_value: JSON.stringify(oldValue),
      new_value: JSON.stringify(newValue),
      reason
    });

    return Response.json({ ok: true, action, profileId, oldValue, newValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}