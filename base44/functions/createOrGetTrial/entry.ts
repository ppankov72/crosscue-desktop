import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { observeTrial } from '../../shared/marketingEvents.ts';
import {
  TRIAL_LIMIT_SECONDS, SHADOW_MODE,
  parseUA, calculateEnvironmentHash, calculateRiskScore,
  getScreenClass, getGeoFromIp, getClientIp, formatTrial, getShadowDecision
} from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const installationId = body.installationId || '';
    if (!installationId) return Response.json({ error: 'installation_id required' }, { status: 400 });

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { device, os, browser } = parseUA(userAgent);
    const ip = getClientIp(req.headers);
    const timezone = body.timezone || '';
    const language = body.language || '';
    const screenClass = getScreenClass(body.screenWidth || 0, body.screenHeight || 0);
    const envHash = calculateEnvironmentHash({ os, browser, device, timezone, language, screenClass });

    // Check if user already has a trial
    const existingTrials = await base44.asServiceRole.entities.Trial.filter({ user_id: user.id }, '-created_date', 5);
    if (existingTrials.length > 0) {
      const trial = existingTrials[0];
      // Update last_activity_at
      await base44.asServiceRole.entities.Trial.update(trial.id, { last_activity_at: new Date().toISOString() });
      return Response.json({ trial: formatTrial({ ...trial, last_activity_at: new Date().toISOString() }), shadowMode: SHADOW_MODE, isNew: false });
    }

    // Gather risk signals
    const installations = await base44.asServiceRole.entities.Installation.filter({ installation_id: installationId }, '-created_date', 10);
    const envMatches = await base44.asServiceRole.entities.Installation.filter({ environment_hash: envHash }, '-created_date', 20);
    const allTrials = await base44.asServiceRole.entities.Trial.list('-created_date', 200);
    const geo = await getGeoFromIp(ip);

    const signals = {
      sameInstallationDifferentAccount: installations.length > 0 && installations.some(i => i.first_user_id !== user.id),
      sameEnvironmentDifferentAccount: envMatches.some(i => i.first_user_id !== user.id),
      sameIpHistory: installations.some(i => i.last_ip === ip && i.first_user_id !== user.id && ip !== 'unknown'),
      multipleTrialsShortTime: allTrials.filter(t => t.created_date > new Date(Date.now() - 86400000).toISOString()).length > 5,
      cookieResetSuspected: envMatches.length > 0 && installations.length === 0
    };

    const risk = calculateRiskScore(signals);

    // Create or update installation
    const now = new Date().toISOString();
    let installation;
    if (installations.length > 0) {
      installation = installations[0];
      await base44.asServiceRole.entities.Installation.update(installation.id, {
        last_seen_at: now,
        last_ip: ip,
        last_country: geo.country,
        browser_family: browser,
        os_family: os,
        device_type: device,
        timezone, language, screen_class: screenClass,
        environment_hash: envHash,
        risk_score: risk.score,
        flagged: risk.level === 'high' || risk.level === 'critical',
        trial_history_count: (installation.trial_history_count || 0) + 1
      });
    } else {
      installation = await base44.asServiceRole.entities.Installation.create({
        installation_id: installationId,
        first_user_id: user.id,
        first_seen_at: now,
        last_seen_at: now,
        browser_family: browser,
        os_family: os,
        device_type: device,
        timezone, language, screen_class: screenClass,
        environment_hash: envHash,
        first_ip: ip, last_ip: ip,
        first_country: geo.country, last_country: geo.country,
        trial_history_count: 1,
        risk_score: risk.score,
        flagged: risk.level === 'high' || risk.level === 'critical'
      });
    }

    // Create trial
    const trial = await base44.asServiceRole.entities.Trial.create({
      user_id: user.id,
      email: user.email,
      installation_id: installationId,
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

    waitUntil(observeTrial(base44,trial,{user}));
    return Response.json({
      trial: formatTrial(trial),
      shadowMode: SHADOW_MODE,
      isNew: true,
      riskLevel: risk.level,
      riskSignals: risk.triggered
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}