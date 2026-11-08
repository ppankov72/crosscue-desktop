import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getHeartbeatStatus } from '../../shared/trialSystem.ts';
import { ENFORCEMENT_MODE, SHADOW_MODE } from '../../shared/permissionSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const trials = await base44.asServiceRole.entities.Trial.list('-created_date', 200);
    const installations = await base44.asServiceRole.entities.Installation.list('-created_date', 200);
    const sessions = await base44.asServiceRole.entities.TrialSession.list('-created_date', 500);
    const entitlements = await base44.asServiceRole.entities.Entitlement.list('-created_date', 200);

    const instMap = {};
    installations.forEach(i => { instMap[i.installation_id] = i; });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const overview = {
      activeTrials: trials.filter(t => t.status === 'active').length,
      trialsToday: trials.filter(t => new Date(t.created_date) >= todayStart).length,
      expiredTrials: trials.filter(t => t.status === 'expired').length,
      totalPlaybackHours: Math.round(trials.reduce((sum, t) => sum + (t.playback_used_seconds || 0), 0) / 3600 * 10) / 10,
      suspiciousAttempts: trials.filter(t => (t.risk_score || 0) > 60).length,
      heartbeatLostSessions: sessions.filter(s => s.end_reason === 'heartbeat_lost').length
    };

    const entMap = {};
    entitlements.forEach(e => {
      if (!entMap[e.user_id] || e.type === 'premium' || (e.type === 'weekend' && entMap[e.user_id].type === 'trial')) {
        entMap[e.user_id] = e;
      }
    });

    const trialRows = trials.map(t => {
      const inst = instMap[t.installation_id] || {};
      const trialSessions = sessions.filter(s => s.trial_id === t.id);
      const activeSession = trialSessions.find(s => s.playback_active);
      const ent = entMap[t.user_id];
      return {
        id: t.id,
        email: t.email,
        userId: t.user_id,
        status: t.status,
        usedSeconds: t.playback_used_seconds || 0,
        remainingSeconds: t.playback_remaining_seconds || 0,
        limitSeconds: t.trial_limit_seconds || 0,
        riskScore: t.risk_score || 0,
        riskSignals: t.risk_signals || '',
        installationId: t.installation_id,
        device: inst.device_type || '',
        os: inst.os_family || '',
        browser: inst.browser_family || '',
        createdAt: t.created_date,
        activatedAt: t.activated_at,
        lastActivityAt: t.last_activity_at,
        lastHeartbeatAt: t.last_heartbeat_at,
        hasActiveSession: !!activeSession,
        heartbeatStatus: activeSession ? getHeartbeatStatus(activeSession.last_heartbeat_at) : 'none',
        sessionCount: trialSessions.length,
        entitlementType: ent?.type || 'none',
        entitlementStatus: ent?.status || 'none',
        entitlementExpiry: ent?.expires_at || ''
      };
    });

    const entitlementRows = entitlements.map(e => ({
      id: e.id,
      userId: e.user_id,
      email: e.email,
      type: e.type,
      status: e.status,
      source: e.source,
      startsAt: e.starts_at,
      expiresAt: e.expires_at,
      trialId: e.trial_id,
      paymentRef: e.payment_reference || '',
      manuallyGranted: e.manually_granted || false,
      grantedBy: e.granted_by || '',
      revokedAt: e.revoked_at || '',
      revokeReason: e.revoke_reason || ''
    }));

    return Response.json({
      overview,
      trials: trialRows,
      entitlements: entitlementRows,
      enforcementMode: ENFORCEMENT_MODE,
      shadowMode: SHADOW_MODE
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}