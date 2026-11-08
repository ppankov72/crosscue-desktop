import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createHmac } from 'node:crypto';
import { hasPermission, ROLES } from '../../shared/rbac.ts';

// Admin: Create an invitation.
// Generates a secure token, stores hash (not raw token).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'invitations.create')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const email = (body.email || '').toLowerCase().trim();
    const invitationType = body.invitationType || 'guest_dj';
    const roleToAssign = body.roleToAssign || 'tester';
    const entitlementToGrant = body.entitlementToGrant || 'none';
    const campaign = body.campaign || '';
    const notes = body.notes || '';
    const expiresAt = body.expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // default 7 days

    if (!email) return Response.json({ error: 'email required' }, { status: 400 });
    if (!['guest_dj', 'member', 'moderator', 'support', 'admin'].includes(invitationType)) {
      return Response.json({ error: 'invalid_invitation_type' }, { status: 400 });
    }
    if (!Object.values(ROLES).includes(roleToAssign)) {
      return Response.json({ error: 'invalid_role' }, { status: 400 });
    }

    // Generate secure random token
    const token = createHmac('sha256', 'crosscue-invitation-secret')
      .update(email + Date.now() + Math.random())
      .digest('hex');

    // Store hash only
    const tokenHash = createHmac('sha256', 'crosscue-invitation-secret')
      .update(token)
      .digest('hex');

    const now = new Date().toISOString();

    const invitation = await base44.asServiceRole.entities.Invitation.create({
      email,
      invitation_type: invitationType,
      role_to_assign: roleToAssign,
      entitlement_to_grant: entitlementToGrant,
      created_by: user.id,
      created_by_email: user.email,
      created_at: now,
      expires_at: expiresAt,
      status: 'pending',
      token_hash: tokenHash,
      campaign,
      notes
    });

    // Audit log
    try {
      await base44.asServiceRole.entities.AdminAuditLog.create({
        admin_user_id: user.id,
        admin_email: user.email,
        action: 'invitation_created',
        target_type: 'invitation',
        target_id: invitation.id,
        old_value: '{}',
        new_value: JSON.stringify({ email, invitationType, roleToAssign, entitlementToGrant }),
        reason: notes
      });
    } catch {}

    // Return the raw token ONCE — admin can share it with the invitee
    return Response.json({
      ok: true,
      invitationId: invitation.id,
      token, // raw token — only returned at creation time
      email,
      invitationType,
      roleToAssign,
      entitlementToGrant,
      expiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}