// Anonymous free-trial onboarding.
// Creates (idempotently by email) a TrialProfile + Trial (40 min) + Installation,
// reuses the existing risk system, and sends ONE welcome email.
// No auth required — this is the entry point for anonymous visitors.
// The trial_token returned is the client-side identity across sessions.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { observeTrial } from '../../shared/marketingEvents.ts';
import {
  TRIAL_LIMIT_SECONDS, SHADOW_MODE,
  parseUA, calculateEnvironmentHash, calculateRiskScore,
  getScreenClass, getGeoFromIp, getClientIp, getShadowDecision
} from '../../shared/trialSystem.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

function uuid() {
  try { return crypto.randomUUID(); } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}

    const email = String(body.email || '').trim().toLowerCase();
    const djNickname = String(body.djNickname || '').trim();
    const avatarUrl = String(body.avatarUrl || '').trim();
    const installationId = String(body.installationId || '').trim();

    if (!EMAIL_RE.test(email)) return Response.json({ error: 'invalid_email' }, { status: 400 });
    if (!djNickname) return Response.json({ error: 'invalid_nickname' }, { status: 400 });
    if (avatarUrl && !IMAGE_EXT_RE.test(avatarUrl) && !/^https?:\/\//i.test(avatarUrl)) {
      return Response.json({ error: 'invalid_avatar' }, { status: 400 });
    }

    // Idempotency: existing profile by email → return, do NOT duplicate or resend email
    const existing = await base44.asServiceRole.entities.TrialProfile.filter({ email }, '-created_date', 1);
    if (existing.length > 0) {
      const profile = existing[0];
      const nowIso = new Date().toISOString();
      await base44.asServiceRole.entities.TrialProfile.update(profile.id, { last_seen_at: nowIso });
      const trial = profile.trial_id ? await base44.asServiceRole.entities.Trial.get(profile.trial_id) : null;
      return Response.json({
        trialToken: profile.trial_token,
        trialId: profile.trial_id || '',
        djNickname: profile.dj_nickname,
        avatarUrl: profile.avatar_url || '',
        email: profile.email,
        remainingSeconds: trial?.playback_remaining_seconds ?? TRIAL_LIMIT_SECONDS,
        status: trial?.status || 'active',
        feedbackSubmitted: Boolean(profile.feedback_score),
        isNew: false
      });
    }

    // New profile
    const trialToken = uuid();
    const now = new Date().toISOString();

    // Environment + risk (reused from createOrGetTrial)
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { device, os, browser } = parseUA(userAgent);
    const ip = getClientIp(req.headers);
    const timezone = body.timezone || '';
    const language = body.language || '';
    const screenClass = getScreenClass(body.screenWidth || 0, body.screenHeight || 0);
    const envHash = calculateEnvironmentHash({ os, browser, device, timezone, language, screenClass });

    const installations = installationId
      ? await base44.asServiceRole.entities.Installation.filter({ installation_id: installationId }, '-created_date', 10)
      : [];
    const envMatches = await base44.asServiceRole.entities.Installation.filter({ environment_hash: envHash }, '-created_date', 20);
    const allTrials = await base44.asServiceRole.entities.Trial.list('-created_date', 200);
    const geo = await getGeoFromIp(ip);

    const signals = {
      sameInstallationDifferentAccount: installations.length > 0 && installations.some(i => i.first_user_id !== `trial:email:${email}`),
      sameEnvironmentDifferentAccount: envMatches.some(i => i.first_user_id !== `trial:email:${email}`),
      sameIpHistory: installations.some(i => i.last_ip === ip && i.first_user_id !== `trial:email:${email}` && ip !== 'unknown'),
      multipleTrialsShortTime: allTrials.filter(t => t.created_date > new Date(Date.now() - 86400000).toISOString()).length > 5,
      cookieResetSuspected: envMatches.length > 0 && installations.length === 0
    };
    const risk = calculateRiskScore(signals);

    // Create / update installation
    let installation;
    if (installations.length > 0) {
      installation = installations[0];
      await base44.asServiceRole.entities.Installation.update(installation.id, {
        last_seen_at: now, last_ip: ip, last_country: geo.country,
        browser_family: browser, os_family: os, device_type: device,
        timezone, language, screen_class: screenClass, environment_hash: envHash,
        risk_score: risk.score,
        flagged: risk.level === 'high' || risk.level === 'critical',
        trial_history_count: (installation.trial_history_count || 0) + 1
      });
    } else if (installationId) {
      installation = await base44.asServiceRole.entities.Installation.create({
        installation_id: installationId,
        first_user_id: `trial:email:${email}`,
        first_seen_at: now, last_seen_at: now,
        browser_family: browser, os_family: os, device_type: device,
        timezone, language, screen_class: screenClass, environment_hash: envHash,
        first_ip: ip, last_ip: ip, first_country: geo.country, last_country: geo.country,
        trial_history_count: 1, risk_score: risk.score,
        flagged: risk.level === 'high' || risk.level === 'critical'
      });
    }

    // Create Trial (reuses Trial entity; synthetic user_id keeps it distinct from real accounts)
    const trial = await base44.asServiceRole.entities.Trial.create({
      user_id: `trial:email:${email}`,
      email,
      installation_id: installationId || '',
      status: 'active',
      trial_limit_seconds: TRIAL_LIMIT_SECONDS,
      playback_used_seconds: 0,
      playback_remaining_seconds: TRIAL_LIMIT_SECONDS,
      activated_at: now,
      last_activity_at: now,
      risk_score: risk.score,
      risk_level: risk.level,
      risk_signals: risk.triggered.join(','),
      shadow_enforcement_decision: getShadowDecision({ status: 'active', playback_used_seconds: 0, playback_remaining_seconds: TRIAL_LIMIT_SECONDS, risk_score: risk.score }, null).decision,
      notes: ''
    });

    // Create TrialProfile
    const profile = await base44.asServiceRole.entities.TrialProfile.create({
      email,
      dj_nickname: djNickname,
      avatar_url: avatarUrl || '',
      trial_id: trial.id,
      trial_token: trialToken,
      installation_id: installationId || '',
      welcome_email_sent: false,
      last_seen_at: now
    });

    // Welcome email — best effort; failure does NOT destroy the trial
    let emailSent = false;
    try {
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
  <h2 style="color:#b45309">Welcome to CROSSCUE 🎧</h2>
  <p>Hi DJ ${djNickname},</p>
  <p>Welcome to CROSSCUE!</p>
  <p>Your free DJ session includes <strong>40 minutes of actual music playback</strong>.</p>
  <p>Take your time preparing your tracks, playlists and setup — only actual playback counts toward your free session.</p>
  <p>We hope you have a great party and enjoy the music. 🎶</p>
  <p>After your session, we'd love to hear what you think about CROSSCUE. You'll be able to rate your experience from 1 to 10 and share your feedback with us.</p>
  <p>Have fun mixing!</p>
  <p style="margin-top:1.5rem">CROSSCUE<br/>Professional Virtual Turntables<br/>crosscue.de</p>
</div>`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Welcome to CROSSCUE 🎧',
        html
      });
      emailSent = true;
      await base44.asServiceRole.entities.TrialProfile.update(profile.id, {
        welcome_email_sent: true,
        welcome_email_sent_at: now
      });
    } catch (err) {
      // Logged via profile flag remaining false; trial still valid
    }

    waitUntil(observeTrial(base44,trial));
    return Response.json({
      trialToken,
      trialId: trial.id,
      djNickname,
      avatarUrl: avatarUrl || '',
      email,
      remainingSeconds: TRIAL_LIMIT_SECONDS,
      status: 'active',
      feedbackSubmitted: false,
      welcomeEmailSent: emailSent,
      isNew: true,
      riskLevel: risk.level,
      riskSignals: risk.triggered
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}