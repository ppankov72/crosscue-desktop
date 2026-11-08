import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createHmac } from 'node:crypto';
import { ROLES } from '../../shared/rbac.ts';
import { getWeekendExpiry, getPremiumExpiry } from '../../shared/permissionSystem.ts';

// Accept an invitation — public endpoint (token-based, no auth required to view).
// One-time use, expiry-checked, revoke-checked.
// Creates entitlement + assigns role when user registers/logs in.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch {}
    const token = body.token || '';
    if (!token) return Response.json({ error: 'token required' }, { status: 400 });

    // Hash the token to look up (we store hashes, not raw tokens)
    const tokenHash = createHmac('sha256', 'crosscue-invitation-secret')
      .update(token)
      .digest('hex');

    const invitations = await base44.asServiceRole.entities.Invitation.filter({ token_hash: tokenHash }, '-created_date', 1);
    if (invitations.length === 0) {
      return Response.json({ error: 'invalid_token' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Check status
    if (invitation.status !== 'pending') {
      return Response.json({ error: 'invitation_' + invitation.status }, { status: 403 });
    }

    // Check expiry
    const now = new Date();
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < now.getTime()) {
      // Mark as expired
      try {
        await base44.asServiceRole.entities.Invitation.bulkUpdate([{
          id: invitation.id,
          status: 'expired'
        }]);
      } catch {}
      return Response.json({ error: 'invitation_expired' }, { status: 403 });
    }

    // Check if user is authenticated (must be logged in to accept)
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    if (!user) {
      // Return invitation details so frontend can prompt login/register
      return Response.json({
        requiresAuth: true,
        invitation: {
          email: invitation.email,
          invitation_type: invitation.invitation_type,
          role_to_assign: invitation.role_to_assign,
          entitlement_to_grant: invitation.entitlement_to_grant,
          campaign: invitation.campaign || ''
        }
      });
    }

    // User is authenticated — verify email matches (if invitation has specific email)
    if (invitation.email && user.email !== invitation.email) {
      return Response.json({
        error: 'email_mismatch',
        expectedEmail: invitation.email,
        actualEmail: user.email
      }, { status: 403 });
    }

    // Mark invitation as accepted
    try {
      await base44.asServiceRole.entities.Invitation.bulkUpdate([{
        id: invitation.id,
        status: 'accepted',
        accepted_at: now.toISOString(),
        accepted_by: user.id
      }]);
    } catch {}

    // Assign role to user — but NEVER downgrade an existing high-level role.
    // If user is already owner/super_admin/admin, don't overwrite with a lower role from invitation.
    const roleToAssign = invitation.role_to_assign || ROLES.MEMBER;
    const currentRole = (user as any).custom_role || ROLES.MEMBER;
    const rolePriority = { owner: 100, super_admin: 90, admin: 80, moderator: 50, support: 40, tester: 30, member: 10 };
    const currentLevel = rolePriority[currentRole] || 0;
    const newLevel = rolePriority[roleToAssign] || 0;

    if (newLevel > currentLevel) {
      // Only upgrade, never downgrade
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          custom_role: roleToAssign
        } as any);
      } catch {
        try {
          await base44.asServiceRole.entities.User.bulkUpdate([{
            id: user.id,
            custom_role: roleToAssign
          } as any]);
        } catch {}
      }
    }
    // If newLevel <= currentLevel, keep the existing (higher) role — don't downgrade

    // Grant entitlement if specified
    let entitlementId = '';
    if (invitation.entitlement_to_grant && invitation.entitlement_to_grant !== 'none') {
      const entType = invitation.entitlement_to_grant;
      const expiresAt = entType === 'weekend' ? getWeekendExpiry(now) : getPremiumExpiry(now);
      try {
        const ent = await base44.asServiceRole.entities.Entitlement.create({
          user_id: user.id,
          email: user.email,
          type: entType,
          status: 'active',
          source: 'admin',
          starts_at: now.toISOString(),
          expires_at: expiresAt,
          trial_id: '',
          manually_granted: true,
          granted_by: invitation.created_by_email || 'invitation'
        });
        entitlementId = ent.id;
      } catch {}
    }

    // Create GuestTester record if this is a guest_dj invitation
    if (invitation.invitation_type === 'guest_dj') {
      try {
        await base44.asServiceRole.entities.GuestTester.create({
          user_id: user.id,
          email: user.email,
          tester_name: user.full_name || user.email,
          invitation_source: 'invitation',
          campaign: invitation.campaign || '',
          invitation_id: invitation.id,
          test_started_at: now.toISOString(),
          final_assessment: 'in_test'
        });
      } catch {}
    }

    // Audit log
    try {
      await base44.asServiceRole.entities.AdminAuditLog.create({
        admin_user_id: invitation.created_by || '',
        admin_email: invitation.created_by_email || '',
        action: 'invitation_accepted',
        target_type: 'invitation',
        target_id: invitation.id,
        old_value: JSON.stringify({ status: 'pending' }),
        new_value: JSON.stringify({ status: 'accepted', accepted_by: user.id, role: roleToAssign, entitlement: invitation.entitlement_to_grant }),
        reason: 'User accepted invitation'
      });
    } catch {}

    return Response.json({
      ok: true,
      roleAssigned: roleToAssign,
      entitlementGranted: invitation.entitlement_to_grant || 'none',
      entitlementId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}