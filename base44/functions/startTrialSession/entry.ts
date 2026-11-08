import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { observeTrial } from '../../shared/marketingEvents.ts';
import {
  HEARTBEAT_TIMEOUT_SECONDS, SHADOW_MODE,
  parseUA, getClientIp, getGeoFromIp, formatTrial, getShadowDecision
} from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const installationId = body.installationId || '';
    const page = body.page || '/';

    // Get user's trial
    const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 1);
    if (trials.length === 0) return Response.json({ error: 'no_trial' }, { status: 404 });
    const trial = trials[0];

    // Find any active session for this trial
    const activeSessions = await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trial.id, playback_active: true }, '-created_date', 5);

    const now = new Date();
    const nowIso = now.toISOString();

    // Close any stale active sessions
    for (const sess of activeSessions) {
      const lastHb = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at) : new Date(sess.session_started_at);
      const elapsed = Math.min((now.getTime() - lastHb.getTime()) / 1000, HEARTBEAT_TIMEOUT_SECONDS);
      const accumulated = Math.max(0, (sess.accumulated_playback_seconds || 0) + Math.max(0, elapsed));
      const endReason = elapsed >= HEARTBEAT_TIMEOUT_SECONDS ? 'heartbeat_lost' : 'stopped';

      await base44.asServiceRole.entities.TrialSession.update(sess.id, {
        session_stopped_at: nowIso,
        last_heartbeat_at: nowIso,
        accumulated_playback_seconds: accumulated,
        playback_active: false,
        end_reason: endReason
      });

      // Update trial used time
      const newUsed = Math.max(0, Math.min(trial.playback_used_seconds + Math.max(0, elapsed), trial.trial_limit_seconds));
      const newRemaining = Math.max(0, trial.trial_limit_seconds - newUsed);
      await base44.asServiceRole.entities.Trial.update(trial.id, {
        playback_used_seconds: newUsed,
        playback_remaining_seconds: newRemaining,
        last_activity_at: nowIso
      });
      trial.playback_used_seconds = newUsed;
      trial.playback_remaining_seconds = newRemaining;
    }

    // Parse environment
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { device, os, browser, browserVersion } = parseUA(userAgent);
    const ip = getClientIp(req.headers);
    const geo = await getGeoFromIp(ip);

    // Compute shadow decision before creating session
    const shadow = getShadowDecision(trial, null);

    // Create new session
    const session = await base44.asServiceRole.entities.TrialSession.create({
      trial_id: trial.id,
      user_id: user.id,
      installation_id: installationId,
      session_started_at: nowIso,
      last_heartbeat_at: nowIso,
      accumulated_playback_seconds: 0,
      playback_active: true,
      browser, browser_version: browserVersion,
      os, device_type: device,
      screen_width: body.screenWidth || 0,
      screen_height: body.screenHeight || 0,
      timezone: body.timezone || '',
      language: body.language || '',
      ip, country: geo.country, city: geo.city,
      user_agent: userAgent,
      page,
      end_reason: '',
      shadow_enforcement_decision: shadow.decision
    });

    await base44.asServiceRole.entities.Trial.update(trial.id, {
      shadow_enforcement_decision: shadow.decision,
      last_activity_at: nowIso
    });

    waitUntil(observeTrial(base44,trial,{user,playing:true}));
    return Response.json({
      sessionId: session.id,
      trial: formatTrial({ ...trial, last_activity_at: nowIso, last_heartbeat_at: nowIso, shadow_enforcement_decision: shadow.decision }),
      shadowMode: SHADOW_MODE,
      shadowDecision: shadow
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}