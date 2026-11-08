import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getHeartbeatStatus, getShadowDecision, formatDuration } from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const trialId = body.trialId || '';
    if (!trialId) return Response.json({ error: 'trialId required' }, { status: 400 });

    const trial = await base44.asServiceRole.entities.Trial.get(trialId);
    if (!trial) return Response.json({ error: 'not_found' }, { status: 404 });

    const installations = await base44.asServiceRole.entities.Installation.filter({ installation_id: trial.installation_id }, '-created_date', 1);
    const installation = installations[0] || null;
    const envMatches = installation ? await base44.asServiceRole.entities.Installation.filter({ environment_hash: installation.environment_hash }, '-created_date', 50) : [];

    const sessions = await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trialId }, '-created_date', 50);
    const activeSession = sessions.find(s => s.playback_active) || null;

    // Linked TrialProfile (anonymous email-based trial) — nickname, avatar, feedback, welcome email
    let trialProfile = null;
    try {
      const profiles = await base44.asServiceRole.entities.TrialProfile.filter({ trial_id: trialId }, '-created_date', 1);
      if (profiles.length > 0) {
        const p = profiles[0];
        trialProfile = {
          djNickname: p.dj_nickname,
          email: p.email,
          avatarUrl: p.avatar_url || '',
          welcomeEmailSent: Boolean(p.welcome_email_sent),
          welcomeEmailSentAt: p.welcome_email_sent_at || '',
          feedbackScore: p.feedback_score || 0,
          feedbackUseAgain: p.feedback_use_again || '',
          feedbackComment: p.feedback_comment || '',
          feedbackSubmittedAt: p.feedback_submitted_at || ''
        };
      }
    } catch {}

    const shadow = getShadowDecision(trial, activeSession);
    const heartbeatStatus = activeSession ? getHeartbeatStatus(activeSession.last_heartbeat_at) : 'none';

    const riskLevel = (trial.risk_score || 0) > 80 ? 'critical' :
                      (trial.risk_score || 0) > 60 ? 'high' :
                      (trial.risk_score || 0) > 30 ? 'medium' : 'low';

    return Response.json({
      trial: {
        id: trial.id,
        userId: trial.user_id,
        email: trial.email,
        status: trial.status,
        createdAt: trial.created_date,
        activatedAt: trial.activated_at,
        expiredAt: trial.expired_at,
        blockedAt: trial.blocked_at,
        blockReason: trial.block_reason || '',
        limitSeconds: trial.trial_limit_seconds,
        usedSeconds: trial.playback_used_seconds || 0,
        remainingSeconds: trial.playback_remaining_seconds || 0,
        percentageUsed: trial.trial_limit_seconds ? Math.round(((trial.playback_used_seconds || 0) / trial.trial_limit_seconds) * 100) : 0,
        riskScore: trial.risk_score || 0,
        riskLevel: trial.risk_level || riskLevel,
        shadowEnforcementDecision: trial.shadow_enforcement_decision || '',
        riskSignals: (trial.risk_signals || '').split(',').filter(Boolean),
        notes: trial.notes || '',
        lastActivityAt: trial.last_activity_at,
        lastHeartbeatAt: trial.last_heartbeat_at
      },
      installation: installation ? {
        installationId: installation.installation_id,
        firstSeenAt: installation.first_seen_at,
        lastSeenAt: installation.last_seen_at,
        browser: installation.browser_family,
        os: installation.os_family,
        device: installation.device_type,
        screenClass: installation.screen_class,
        timezone: installation.timezone,
        language: installation.language,
        environmentHash: installation.environment_hash,
        firstIp: installation.first_ip,
        lastIp: installation.last_ip,
        firstCountry: installation.first_country,
        lastCountry: installation.last_country,
        trialHistoryCount: installation.trial_history_count || 0,
        flagged: installation.flagged
      } : null,
      activeSession: activeSession ? {
        id: activeSession.id,
        startedAt: activeSession.session_started_at,
        lastHeartbeatAt: activeSession.last_heartbeat_at,
        accumulatedSeconds: activeSession.accumulated_playback_seconds || 0,
        heartbeatStatus,
        ip: activeSession.ip,
        country: activeSession.country,
        city: activeSession.city,
        page: activeSession.page
      } : null,
      sessions: sessions.slice(0, 20).map(s => ({
        id: s.id,
        startedAt: s.session_started_at,
        stoppedAt: s.session_stopped_at,
        accumulatedSeconds: s.accumulated_playback_seconds || 0,
        playbackActive: s.playback_active,
        endReason: s.end_reason || '',
        ip: s.ip,
        country: s.country,
        city: s.city
      })),
      shadowDecision: shadow,
      shadowMode: true,
      trialProfile,
      envMatchCount: envMatches.filter(i => i.first_user_id !== trial.user_id).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}