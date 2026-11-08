// Server-authoritative playback accounting for anonymous email-based trials.
// Mirrors the existing TrialSession/Trial heartbeat logic but keyed by trial_token.
// playbackActive=true  → start/continue accumulating playback time
// playbackActive=false → finalize and stop accumulating
// Time is tracked by server clock (last_heartbeat_at), NOT client-reported values.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { observeTrial } from '../../shared/marketingEvents.ts';
import {
  HEARTBEAT_TIMEOUT_SECONDS, TRIAL_LIMIT_SECONDS,
  parseUA, getClientIp, getGeoFromIp
} from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const trialToken = String(body.trialToken || '').trim();
    const playbackActive = Boolean(body.playbackActive);
    if (!trialToken) return Response.json({ error: 'token_required' }, { status: 400 });

    const profiles = await base44.asServiceRole.entities.TrialProfile.filter({ trial_token: trialToken }, '-created_date', 1);
    if (profiles.length === 0) return Response.json({ allowed: false, reason: 'no_trial' }, { status: 404 });
    const profile = profiles[0];

    const trial = profile.trial_id ? await base44.asServiceRole.entities.Trial.get(profile.trial_id) : null;
    if (!trial) return Response.json({ allowed: false, reason: 'no_trial' });

    // Already expired/blocked — no accumulation
    if (trial.status === 'blocked') return Response.json({ allowed: false, reason: 'trial_blocked', remainingSeconds: 0, status: 'blocked' });
    if (trial.status === 'expired' || (trial.playback_remaining_seconds ?? 0) <= 0) {
      return Response.json({ allowed: false, reason: 'trial_expired', remainingSeconds: 0, status: 'expired' });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Find active session for this trial
    const activeSessions = await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trial.id, playback_active: true }, '-created_date', 5);

    let accumulatedSession = 0;
    let usedDelta = 0;

    if (playbackActive) {
      // Close any stale sessions first, accumulating their elapsed (capped)
      for (const sess of activeSessions) {
        const lastHb = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at) : new Date(sess.session_started_at);
        const elapsed = Math.min((now.getTime() - lastHb.getTime()) / 1000, HEARTBEAT_TIMEOUT_SECONDS);
        accumulatedSession = Math.max(0, (sess.accumulated_playback_seconds || 0) + Math.max(0, elapsed));
        await base44.asServiceRole.entities.TrialSession.update(sess.id, {
          session_stopped_at: nowIso, last_heartbeat_at: nowIso,
          accumulated_playback_seconds: accumulatedSession,
          playback_active: false, end_reason: 'stopped'
        });
        usedDelta += Math.max(0, elapsed);
      }

      // Create a fresh active session
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const { device, os, browser, browserVersion } = parseUA(userAgent);
      const ip = getClientIp(req.headers);
      const geo = await getGeoFromIp(ip);
      await base44.asServiceRole.entities.TrialSession.create({
        trial_id: trial.id,
        user_id: trial.user_id,
        installation_id: profile.installation_id || '',
        session_started_at: nowIso, last_heartbeat_at: nowIso,
        accumulated_playback_seconds: 0, playback_active: true,
        browser, browser_version: browserVersion, os, device_type: device,
        screen_width: body.screenWidth || 0, screen_height: body.screenHeight || 0,
        timezone: body.timezone || '', language: body.language || '',
        ip, country: geo.country, city: geo.city, user_agent: userAgent,
        page: body.page || '', end_reason: '', shadow_enforcement_decision: ''
      });
    } else {
      // Stop: finalize all active sessions
      for (const sess of activeSessions) {
        const lastHb = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at) : new Date(sess.session_started_at);
        const elapsed = Math.min((now.getTime() - lastHb.getTime()) / 1000, HEARTBEAT_TIMEOUT_SECONDS);
        accumulatedSession = Math.max(0, (sess.accumulated_playback_seconds || 0) + Math.max(0, elapsed));
        await base44.asServiceRole.entities.TrialSession.update(sess.id, {
          session_stopped_at: nowIso, last_heartbeat_at: nowIso,
          accumulated_playback_seconds: accumulatedSession,
          playback_active: false, end_reason: body.endReason || 'stopped'
        });
        usedDelta += Math.max(0, elapsed);
      }
    }

    // Update Trial used/remaining
    let newUsed = Math.max(0, Math.min((trial.playback_used_seconds || 0) + usedDelta, trial.trial_limit_seconds));
    let newRemaining = Math.max(0, trial.trial_limit_seconds - newUsed);
    const expired = newUsed >= trial.trial_limit_seconds;
    const updatedTrial = {
      playback_used_seconds: newUsed,
      playback_remaining_seconds: newRemaining,
      last_activity_at: nowIso,
      last_heartbeat_at: nowIso,
      status: expired ? 'expired' : trial.status,
      expired_at: expired ? nowIso : trial.expired_at
    };
    await base44.asServiceRole.entities.Trial.update(trial.id, updatedTrial);

    waitUntil(observeTrial(base44,{...trial,...updatedTrial},{playing:playbackActive}));
    const allowed = !expired && trial.status !== 'blocked';
    return Response.json({
      allowed,
      reason: expired ? 'trial_expired' : (allowed ? 'trial_active' : 'trial_blocked'),
      remainingSeconds: newRemaining,
      usedSeconds: newUsed,
      limitSeconds: trial.trial_limit_seconds,
      status: expired ? 'expired' : trial.status,
      entitlementType: 'trial'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}