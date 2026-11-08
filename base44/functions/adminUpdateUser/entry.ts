import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  ROLES, hasPermission, canManageRole, getCustomRole, ROLE_LEVEL
} from '../../shared/rbac.ts';

// Admin: Update user role, account status, or playback override.
// Includes privilege escalation prevention and owner self-protection.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const targetUserId = body.userId || '';
    const action = body.action || ''; // 'set_role', 'set_status', 'set_override'
    if (!targetUserId || !action) {
      return Response.json({ error: 'userId and action required' }, { status: 400 });
    }

    // Fetch target user
    const targetUser = await base44.asServiceRole.entities.User.get(targetUserId);
    if (!targetUser) return Response.json({ error: 'user_not_found' }, { status: 404 });

    const actorRole = getCustomRole(user);
    const targetCurrentRole = getCustomRole(targetUser);

    let updateData: any = {};
    let oldValue: any = {};
    let newValue: any = {};
    let auditAction = action;

    switch (action) {
      case 'set_role': {
        if (!hasPermission(user, 'owner.manage_roles')) {
          return Response.json({ error: 'Forbidden — owner.manage_roles required' }, { status: 403 });
        }
        const newRole = body.role || '';
        if (!Object.values(ROLES).includes(newRole)) {
          return Response.json({ error: 'invalid_role' }, { status: 400 });
        }
        // Privilege escalation check: actor must outrank target role
        if (!canManageRole(user, newRole)) {
          return Response.json({ error: 'cannot_assign_higher_role' }, { status: 403 });
        }
        // Self-protection: don't allow removing the last owner
        if (targetCurrentRole === ROLES.OWNER && newRole !== ROLES.OWNER) {
          const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
          const owners = allUsers.filter((u: any) => (u as any).custom_role === ROLES.OWNER);
          if (owners.length <= 1) {
            return Response.json({ error: 'cannot_remove_last_owner' }, { status: 403 });
          }
        }
        oldValue = { custom_role: targetCurrentRole };
        newValue = { custom_role: newRole };
        updateData = { custom_role: newRole };
        break;
      }
      case 'set_status': {
        if (!hasPermission(user, 'users.block')) {
          return Response.json({ error: 'Forbidden — users.block required' }, { status: 403 });
        }
        const newStatus = body.status || '';
        if (!['active', 'pending', 'suspended', 'blocked', 'deleted'].includes(newStatus)) {
          return Response.json({ error: 'invalid_status' }, { status: 400 });
        }
        // Self-protection: don't block the last owner
        if (targetCurrentRole === ROLES.OWNER && (newStatus === 'blocked' || newStatus === 'suspended')) {
          const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
          const owners = allUsers.filter((u: any) => (u as any).custom_role === ROLES.OWNER && (u as any).account_status !== 'blocked');
          if (owners.length <= 1) {
            return Response.json({ error: 'cannot_block_last_owner' }, { status: 403 });
          }
        }
        oldValue = { account_status: (targetUser as any).account_status || 'active' };
        newValue = { account_status: newStatus };
        updateData = { account_status: newStatus };
        break;
      }
      case 'set_override': {
        if (!hasPermission(user, 'owner.manage_override')) {
          return Response.json({ error: 'Forbidden — owner.manage_override required' }, { status: 403 });
        }
        const override = Boolean(body.override);
        oldValue = { playback_override: (targetUser as any).playback_override || false };
        newValue = { playback_override: override };
        updateData = {
          playback_override: override,
          override_reason: body.reason || '',
          override_set_by: user.email,
          override_set_at: new Date().toISOString()
        };
        auditAction = override ? 'override_enabled' : 'override_disabled';
        break;
      }
      default:
        return Response.json({ error: 'unknown_action' }, { status: 400 });
    }

    // Apply update
    try {
      await base44.asServiceRole.entities.User.update(targetUserId, updateData as any);
    } catch {
      try {
        await base44.asServiceRole.entities.User.bulkUpdate([{ id: targetUserId, ...updateData } as any]);
      } catch (e) {
        return Response.json({ error: 'update_failed: ' + e.message }, { status: 500 });
      }
    }

    // Audit log
    try {
      await base44.asServiceRole.entities.AdminAuditLog.create({
        admin_user_id: user.id,
        admin_email: user.email,
        action: auditAction,
        target_type: 'user',
        target_id: targetUserId,
        old_value: JSON.stringify(oldValue),
        new_value: JSON.stringify(newValue),
        reason: body.reason || ''
      });
    } catch {}

    return Response.json({ ok: true, action: auditAction, userId: targetUserId, oldValue, newValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}