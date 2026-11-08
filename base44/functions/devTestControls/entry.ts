import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasDeveloperAccess, isDevelopmentMode, getBypassReason } from '../../shared/developerAccess.ts';
import { getPlan } from '../../shared/plans.ts';
import { getWeekendExpiry, getPremiumExpiry } from '../../shared/permissionSystem.ts';

// Phase F — Development test controls.
// Developer-only endpoint for testing entitlements without real payments.
// ONLY accessible in development mode or by owner/developer users.
//
// Actions:
// - grant_entitlement: create a test entitlement (weekend/premium)
// - revoke_entitlement: revoke an entitlement
// - reset_trial: reset trial usage to zero
// - list_test_users: list users with test entitlements
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only developers can access this endpoint
    if (!hasDeveloperAccess(user)) {
      return Response.json({ error: 'Forbidden', message: 'Developer access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || '';
    const bypassReason = getBypassReason(user);

    // ============================================================
    // GRANT ENTITLEMENT (test)
    // ============================================================
    if (action === 'grant_entitlement') {
      const entitlementType = body.entitlementType || '';
      if (!['weekend', 'premium'].includes(entitlementType)) {
        return Response.json({ error: 'invalid_entitlement_type', allowed: ['weekend', 'premium'] }, { status: 400 });
      }

      const now = new Date();
      let expiresAt = '';
      if (entitlementType === 'weekend') {
        expiresAt = getWeekendExpiry(now);
      } else if (entitlementType === 'premium') {
        expiresAt = getPremiumExpiry(now);
      }

      const entitlement = await base44.asServiceRole.entities.Entitlement.create({
        user_id: user.id,
        email: user.email,
        type: entitlementType,
        status: 'active',
        source: 'admin', // marked as admin-granted (test)
        starts_at: now.toISOString(),
        expires_at: expiresAt,
        manually_granted: true,
        granted_by: user.id,
        license_reference: `dev_test_${Date.now()}`
      });

      // Audit log
      try {
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action: 'dev_grant_entitlement',
          target_type: 'Entitlement',
          target_id: entitlement.id,
          new_value: JSON.stringify({ type: entitlementType, expires_at: expiresAt }),
          reason: `Development test (${bypassReason})`
        });
      } catch {}

      return Response.json({
        ok: true,
        entitlement: {
          id: entitlement.id,
          type: entitlementType,
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiresAt,
          source: 'admin',
          manually_granted: true
        },
        bypassReason
      });
    }

    // ============================================================
    // REVOKE ENTITLEMENT (test)
    // ============================================================
    if (action === 'revoke_entitlement') {
      const entitlementId = body.entitlementId || '';
      if (!entitlementId) return Response.json({ error: 'entitlementId required' }, { status: 400 });

      const entitlement = await base44.asServiceRole.entities.Entitlement.get(entitlementId);
      if (!entitlement) return Response.json({ error: 'entitlement_not_found' }, { status: 404 });
      if (entitlement.user_id !== user.id) return Response.json({ error: 'not_owner' }, { status: 403 });

      await base44.asServiceRole.entities.Entitlement.bulkUpdate([{
        id: entitlementId,
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoke_reason: 'dev_test_revoke'
      }]);

      // Audit log
      try {
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action: 'dev_revoke_entitlement',
          target_type: 'Entitlement',
          target_id: entitlementId,
          old_value: JSON.stringify({ status: 'active' }),
          new_value: JSON.stringify({ status: 'revoked' }),
          reason: `Development test (${bypassReason})`
        });
      } catch {}

      return Response.json({ ok: true, revoked: entitlementId, bypassReason });
    }

    // ============================================================
    // RESET TRIAL (test)
    // ============================================================
    if (action === 'reset_trial') {
      const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 1);
      if (trials.length === 0) return Response.json({ error: 'no_trial' }, { status: 404 });

      const trial = trials[0];
      await base44.asServiceRole.entities.Trial.update(trial.id, {
        status: 'active',
        playback_used_seconds: 0,
        playback_remaining_seconds: trial.trial_limit_seconds || 14400,
        last_activity_at: new Date().toISOString(),
        expired_at: '',
        blocked_at: '',
        block_reason: ''
      });

      // Audit log
      try {
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action: 'dev_reset_trial',
          target_type: 'Trial',
          target_id: trial.id,
          old_value: JSON.stringify({ used: trial.playback_used_seconds, remaining: trial.playback_remaining_seconds }),
          new_value: JSON.stringify({ used: 0, remaining: trial.trial_limit_seconds }),
          reason: `Development test (${bypassReason})`
        });
      } catch {}

      return Response.json({
        ok: true,
        trial: {
          id: trial.id,
          status: 'active',
          used_seconds: 0,
          remaining_seconds: trial.trial_limit_seconds,
          limit_seconds: trial.trial_limit_seconds
        },
        bypassReason
      });
    }

    // ============================================================
    // STATUS
    // ============================================================
    if (action === 'status') {
      const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ user_id: user.id }, '-created_date', 50);
      const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 1);
      const trial = trials[0] || null;

      return Response.json({
        developmentMode: isDevelopmentMode(),
        developerAccess: true,
        bypassReason,
        user: {
          id: user.id,
          email: user.email,
          custom_role: (user as any).custom_role || 'member',
          playback_override: (user as any).playback_override || false
        },
        entitlements: entitlements.map((e: any) => ({
          id: e.id,
          type: e.type,
          status: e.status,
          source: e.source,
          starts_at: e.starts_at,
          expires_at: e.expires_at,
          manually_granted: e.manually_granted
        })),
        trial: trial ? {
          id: trial.id,
          status: trial.status,
          used_seconds: trial.playback_used_seconds || 0,
          remaining_seconds: trial.playback_remaining_seconds || 0,
          limit_seconds: trial.trial_limit_seconds || 0
        } : null
      });
    }

    return Response.json({ error: 'invalid_action', allowed: ['grant_entitlement', 'revoke_entitlement', 'reset_trial', 'status'] }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}