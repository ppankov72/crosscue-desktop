import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { TRIAL_LIMIT_SECONDS } from '../../shared/trialSystem.ts';
import { getWeekendExpiry, getPremiumExpiry } from '../../shared/permissionSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || '';
    const trialId = body.trialId || '';
    const reason = body.reason || '';
    const extendSeconds = body.extendSeconds || 0;
    const entitlementId = body.entitlementId || '';
    const userId = body.userId || '';

    // Entitlement actions don't require trialId
    const entActions = ['grant_weekend', 'grant_premium', 'revoke_entitlement'];
    if (!action || (!trialId && !entActions.includes(action))) {
      return Response.json({ error: 'action and trialId required' }, { status: 400 });
    }

    // Only fetch trial if trialId is provided (entitlement-only actions skip this)
    let trial = null;
    if (trialId) {
      trial = await base44.asServiceRole.entities.Trial.get(trialId);
      if (!trial) return Response.json({ error: 'trial_not_found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    let oldValue = {};
    let newValue = {};
    let updateData = {};

    switch (action) {
      case 'extend': {
        const newLimit = (trial.trial_limit_seconds || TRIAL_LIMIT_SECONDS) + extendSeconds;
        const newRemaining = Math.max(0, newLimit - (trial.playback_used_seconds || 0));
        oldValue = { trial_limit_seconds: trial.trial_limit_seconds, playback_remaining_seconds: trial.playback_remaining_seconds };
        updateData = { trial_limit_seconds: newLimit, playback_remaining_seconds: newRemaining, status: trial.status === 'expired' ? 'active' : trial.status, expired_at: trial.status === 'expired' ? '' : trial.expired_at };
        newValue = { trial_limit_seconds: newLimit, playback_remaining_seconds: newRemaining };
        break;
      }
      case 'reset': {
        oldValue = { playback_used_seconds: trial.playback_used_seconds, playback_remaining_seconds: trial.playback_remaining_seconds, status: trial.status };
        updateData = { playback_used_seconds: 0, playback_remaining_seconds: trial.trial_limit_seconds, status: 'active', expired_at: '', blocked_at: '', block_reason: '' };
        newValue = { playback_used_seconds: 0, status: 'active' };
        break;
      }
      case 'block': {
        oldValue = { status: trial.status, block_reason: trial.block_reason };
        updateData = { status: 'blocked', blocked_at: nowIso, block_reason: reason || 'manual_admin' };
        newValue = { status: 'blocked', block_reason: reason || 'manual_admin' };
        break;
      }
      case 'unblock': {
        oldValue = { status: trial.status, block_reason: trial.block_reason };
        updateData = { status: 'active', blocked_at: '', block_reason: '' };
        newValue = { status: 'active' };
        break;
      }
      case 'terminate': {
        const activeSessions = await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trialId, playback_active: true }, '-created_date', 5);
        for (const sess of activeSessions) {
          await base44.asServiceRole.entities.TrialSession.update(sess.id, {
            session_stopped_at: nowIso,
            playback_active: false,
            end_reason: 'manual_admin'
          });
        }
        oldValue = { sessions_terminated: activeSessions.length };
        newValue = { sessions_terminated: activeSessions.length };
        break;
      }
      case 'grant_weekend': {
        const targetUserId = userId || trial?.user_id || '';
        const targetEmail = trial?.email || '';
        if (!targetUserId) return Response.json({ error: 'userId required' }, { status: 400 });
        const now = new Date();
        const ent = await base44.asServiceRole.entities.Entitlement.create({
          user_id: targetUserId,
          email: targetEmail,
          type: 'weekend',
          status: 'active',
          source: 'admin',
          starts_at: now.toISOString(),
          expires_at: getWeekendExpiry(now),
          trial_id: trialId || '',
          manually_granted: true,
          granted_by: user.email
        });
        oldValue = {};
        newValue = { type: 'weekend', status: 'active', expires_at: ent.expires_at };
        // Use trialId as target for audit, or entitlement id
        const auditTargetId = trialId || ent.id;
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id, admin_email: user.email, action,
          target_type: 'entitlement', target_id: ent.id,
          old_value: '{}', new_value: JSON.stringify(newValue), reason
        });
        return Response.json({ ok: true, action, entitlementId: ent.id, oldValue, newValue });
      }
      case 'grant_premium': {
        const targetUserId = userId || trial?.user_id || '';
        const targetEmail = trial?.email || '';
        if (!targetUserId) return Response.json({ error: 'userId required' }, { status: 400 });
        const now = new Date();
        const ent = await base44.asServiceRole.entities.Entitlement.create({
          user_id: targetUserId,
          email: targetEmail,
          type: 'premium',
          status: 'active',
          source: 'admin',
          starts_at: now.toISOString(),
          expires_at: getPremiumExpiry(now),
          trial_id: trialId || '',
          manually_granted: true,
          granted_by: user.email
        });
        oldValue = {};
        newValue = { type: 'premium', status: 'active', expires_at: ent.expires_at };
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id, admin_email: user.email, action,
          target_type: 'entitlement', target_id: ent.id,
          old_value: '{}', new_value: JSON.stringify(newValue), reason
        });
        return Response.json({ ok: true, action, entitlementId: ent.id, oldValue, newValue });
      }
      case 'revoke_entitlement': {
        if (!entitlementId) return Response.json({ error: 'entitlementId required' }, { status: 400 });
        oldValue = { status: 'active' };
        // Use bulkUpdate instead of update — Entitlement.update() fails from backend functions
        // due to a platform issue with createClientFromRequest + Entitlement entity.
        await base44.asServiceRole.entities.Entitlement.bulkUpdate([{
          id: entitlementId,
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoke_reason: reason || 'manual_admin'
        }]);
        newValue = { status: 'revoked', revoke_reason: reason || 'manual_admin' };
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id, admin_email: user.email, action,
          target_type: 'entitlement', target_id: entitlementId,
          old_value: JSON.stringify(oldValue), new_value: JSON.stringify(newValue), reason
        });
        return Response.json({ ok: true, action, entitlementId, oldValue, newValue });
      }
      default:
        return Response.json({ error: 'unknown_action' }, { status: 400 });
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.Trial.update(trialId, updateData);
    }

    // Create audit log
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_user_id: user.id,
      admin_email: user.email,
      action,
      target_type: 'trial',
      target_id: trialId,
      old_value: JSON.stringify(oldValue),
      new_value: JSON.stringify(newValue),
      reason
    });

    return Response.json({ ok: true, action, trialId, oldValue, newValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}