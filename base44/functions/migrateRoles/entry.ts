import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ROLES } from '../../shared/rbac.ts';
import { syncPlans } from '../../shared/plans.ts';

// One-time migration: assigns owner role to existing admin, syncs plans.
// Safe to call multiple times — idempotent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Find all admin users
    const admins = await base44.asServiceRole.entities.User.list('-created_date', 100);
    const adminUsers = admins.filter(u => u.role === 'admin');

    let migrated = 0;
    let alreadyOwner = 0;

    for (const adminUser of adminUsers) {
      const currentCustomRole = (adminUser as any).custom_role;
      if (currentCustomRole === ROLES.OWNER) {
        alreadyOwner++;
        continue;
      }
      // Assign owner role to existing admins who don't have a custom_role yet
      // or have the default 'member' role
      if (!currentCustomRole || currentCustomRole === ROLES.MEMBER) {
        try {
          await base44.asServiceRole.entities.User.update(adminUser.id, {
            custom_role: ROLES.OWNER,
            account_status: 'active',
            playback_override: true // owner gets playback override by default
          } as any);
          migrated++;
        } catch (e) {
          // Try bulkUpdate if update fails
          try {
            await base44.asServiceRole.entities.User.bulkUpdate([{
              id: adminUser.id,
              custom_role: ROLES.OWNER,
              account_status: 'active',
              playback_override: true
            } as any]);
            migrated++;
          } catch {}
        }
      }
    }

    // Sync plans to Plan entity
    try { await syncPlans(base44); } catch {}

    // Count owners
    const ownerCount = adminUsers.filter(u => (u as any).custom_role === ROLES.OWNER).length + migrated;

    return Response.json({
      ok: true,
      migrated,
      alreadyOwner,
      totalAdmins: adminUsers.length,
      ownerCount,
      plansSynced: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}