import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  decidePermission, signPermissionToken, evaluateTrial, pickBestEntitlement,
  isSessionStale, TRIAL_VALIDATION_INTERVAL_SECONDS, ENFORCEMENT_MODE,
  PERMISSION_REASONS, NETWORK_GRACE_SECONDS
} from '../../shared/permissionSystem.ts';
import { hasDeveloperAccess, getBypassReason } from '../../shared/developerAccess.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const serverTime = new Date();

    // Get user's latest trial
    const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 1);
    let trial = trials.length > 0 ? trials[0] : null;

    // Get user's entitlements
    const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ user_id: user.id }, '-created_date', 50);

    // Get active sessions and clean up stale ones
    const activeSessions = await base44.asServiceRole.entities.TrialSession.filter({
      user_id: user.id, playback_active: true
    }, '-created_date', 5);

    let sessionId = null;
    for (const sess of activeSessions) {
      if (isSessionStale(sess.last_heartbeat_at, serverTime)) {
        // Wrap in try/catch — a failed session cleanup must NOT block playback permission
        try {
          await base44.asServiceRole.entities.TrialSession.update(sess.id, {
            session_stopped_at: serverTime.toISOString(),
            playback_active: false,
            end_reason: 'stale_session'
          });
        } catch {}
      } else {
        sessionId = sess.id; // keep the most recent active session
      }
    }

    // If trial is expired, update status server-side (wrapped — must not block playback)
    if (trial && trial.status === 'active') {
      const trialEval = evaluateTrial(trial);
      if (!trialEval.allowed && trialEval.reason === PERMISSION_REASONS.DENY_TRIAL_EXPIRED) {
        try {
          await base44.asServiceRole.entities.Trial.update(trial.id, {
            status: 'expired',
            expired_at: serverTime.toISOString()
          });
        } catch {}
        trial = { ...trial, status: 'expired', expired_at: serverTime.toISOString() };
      }
    }

    // If entitlements are expired, update their status (use bulkUpdate — Entitlement.update fails from backend)
    const expiredEntIds = entitlements
      .filter(e => e.status === 'active' && e.expires_at && serverTime.getTime() > new Date(e.expires_at).getTime())
      .map(e => e.id);
    if (expiredEntIds.length > 0) {
      try {
        await base44.asServiceRole.entities.Entitlement.bulkUpdate(
          expiredEntIds.map(id => ({ id, status: 'expired' }))
        );
      } catch {}
    }

    // Re-fetch entitlements after status update
    const updatedEntitlements = entitlements.map(e =>
      e.status === 'active' && e.expires_at && serverTime.getTime() > new Date(e.expires_at).getTime()
        ? { ...e, status: 'expired' }
        : e
    );

    // Developer access bypass — checked before normal permission flow
    if (hasDeveloperAccess(user)) {
      const bypassReason = getBypassReason(user);
      const devDecision = {
        allowed: true,
        entitlementType: 'developer',
        reason: `developer_access_${bypassReason}`,
        remainingSeconds: -1,
        serverTime: serverTime.toISOString(),
        nextValidationInSeconds: TRIAL_VALIDATION_INTERVAL_SECONDS,
        trialId: trial?.id || '',
        sessionId: sessionId || '',
        token: '',
        lockState: 'unlocked'
      };
      devDecision.token = signPermissionToken(devDecision, user.id);
      return Response.json({
        ...devDecision,
        enforcementMode: ENFORCEMENT_MODE,
        networkGraceSeconds: NETWORK_GRACE_SECONDS,
        developerAccess: true,
        bypassReason
      });
    }

    // Central permission decision
    const decision = decidePermission({
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        custom_role: (user as any).custom_role || 'member',
        account_status: (user as any).account_status || 'active',
        playback_override: (user as any).playback_override || false
      },
      trial: trial ? {
        id: trial.id,
        status: trial.status,
        trial_limit_seconds: trial.trial_limit_seconds,
        playback_used_seconds: trial.playback_used_seconds,
        playback_remaining_seconds: trial.playback_remaining_seconds,
        risk_score: trial.risk_score,
        risk_level: trial.risk_level
      } : null,
      entitlements: updatedEntitlements.map(e => ({
        id: e.id,
        user_id: e.user_id,
        type: e.type,
        status: e.status,
        starts_at: e.starts_at,
        expires_at: e.expires_at,
        trial_id: e.trial_id,
        source: e.source
      })),
      sessionId,
      serverTime
    });

    // Sign the short-lived token
    decision.token = signPermissionToken(decision, user.id);

    return Response.json({
      ...decision,
      enforcementMode: ENFORCEMENT_MODE,
      networkGraceSeconds: NETWORK_GRACE_SECONDS
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}