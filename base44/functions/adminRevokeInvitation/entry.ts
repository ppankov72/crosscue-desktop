import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';

// Admin: Revoke an invitation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'invitations.revoke')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const invitationId = body.invitationId || '';
    const reason = body.reason || 'manual_admin';
    if (!invitationId) return Response.json({ error: 'invitationId required' }, { status: 400 });

    const invitation = await base44.asServiceRole.entities.Invitation.get(invitationId);
    if (!invitation) return Response.json({ error: 'not_found' }, { status: 404 });

    const oldValue = { status: invitation.status };
    try {
      await base44.asServiceRole.entities.Invitation.bulkUpdate([{
        id: invitationId,
        status: 'revoked'
      }]);
    } catch (e) {
      return Response.json({ error: 'update_failed: ' + e.message }, { status: 500 });
    }

    try {
      await base44.asServiceRole.entities.AdminAuditLog.create({
        admin_user_id: user.id,
        admin_email: user.email,
        action: 'invitation_revoked',
        target_type: 'invitation',
        target_id: invitationId,
        old_value: JSON.stringify(oldValue),
        new_value: JSON.stringify({ status: 'revoked' }),
        reason
      });
    } catch {}

    return Response.json({ ok: true, invitationId, oldValue, newValue: { status: 'revoked' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}