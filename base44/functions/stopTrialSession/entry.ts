import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { observeTrial } from '../../shared/marketingEvents.ts';
import {
  HEARTBEAT_TIMEOUT_SECONDS, SHADOW_MODE,
  formatTrial, getShadowDecision
} from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const endReason = body.endReason || 'stopped';

    // Get user's trial
    const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 1);
    if (trials.length === 0) return Response.json({ ok: true });
    const trial = trials[0];

    // Find active session
    const activeSessions = await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trial.id, playback_active: true }, '-created_date', 1);
    if (activeSessions.length === 0) return Response.json({ ok: true });
    const sess = activeSessions[0];

    const now = new Date();
    const nowIso = now.toISOString();
    const lastHb = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at) : new Date(sess.session_started_at);
    const elapsed = Math.min((now.getTime() - lastHb.getTime()) / 1000, HEARTBEAT_TIMEOUT_SECONDS);

    const accumulated = Math.max(0, (sess.accumulated_playback_seconds || 0) + Math.max(0, elapsed));
    await base44.asServiceRole.entities.TrialSession.update(sess.id, {
      session_stopped_at: nowIso,
      last_heartbeat_at: nowIso,
      accumulated_playback_seconds: accumulated,
      playback_active: false,
      end_reason: endReason
    });

    const newUsed = Math.max(0, Math.min(trial.playback_used_seconds + Math.max(0, elapsed), trial.trial_limit_seconds));
    const newRemaining = Math.max(0, trial.trial_limit_seconds - newUsed);
    const expired = newUsed >= trial.trial_limit_seconds;
    const shadow = getShadowDecision({ ...trial, playback_used_seconds: newUsed, playback_remaining_seconds: newRemaining, status: expired ? 'expired' : trial.status }, null);
    await base44.asServiceRole.entities.Trial.update(trial.id, {
      playback_used_seconds: newUsed,
      playback_remaining_seconds: newRemaining,
      last_activity_at: nowIso,
      last_heartbeat_at: nowIso,
      status: expired ? 'expired' : trial.status,
      expired_at: expired ? nowIso : trial.expired_at,
      shadow_enforcement_decision: shadow.decision
    });

    waitUntil(observeTrial(base44,{...trial,playback_used_seconds:newUsed,status:expired?'expired':trial.status},{user}));
    return Response.json({
      ok: true,
      trial: formatTrial({ ...trial, playback_used_seconds: newUsed, playback_remaining_seconds: newRemaining, last_activity_at: nowIso, last_heartbeat_at: nowIso, status: expired ? 'expired' : trial.status, shadow_enforcement_decision: shadow.decision }),
      shadowMode: SHADOW_MODE,
      shadowDecision: shadow
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}