// Trial system shared configuration and helpers.
// Used by: createOrGetTrial, startTrialSession, trialHeartbeat, stopTrialSession,
//          getTrialAdminData, getTrialDetail, adminTrialAction, logSession

export const TRIAL_LIMIT_SECONDS = 2400; // 40 minutes of active playback (free trial)
export const HEARTBEAT_INTERVAL_SECONDS = 5;
export const HEARTBEAT_TIMEOUT_SECONDS = 30;
export const SHADOW_MODE = false; // Phase B: real enforcement
export const ENFORCEMENT_MODE = true;
export const NETWORK_GRACE_SECONDS = 3;
export const FADE_OUT_SECONDS = 2;

// Parse User-Agent into device, os, browser, browserVersion
export function parseUA(ua) {
  let device = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';

  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  const versionMatch = ua.match(/(?:Edg|OPR|Chrome|Firefox|Version)\/(\d+)/);
  const browserVersion = versionMatch ? versionMatch[1] : '';

  return { device, os, browser, browserVersion };
}

// Screen class from resolution — coarse, non-invasive
export function getScreenClass(width, height) {
  const pixels = (width || 0) * (height || 0);
  if (pixels >= 2073600) return 'xlarge';
  if (pixels >= 1049088) return 'large';
  if (pixels >= 786432) return 'medium';
  return 'small';
}

// Simple string hash — NOT cryptographic, just for environment matching
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Environment hash from normalized low-risk signals
export function calculateEnvironmentHash({ os, browser, device, timezone, language, screenClass }) {
  const normalized = [os, browser, device, timezone, language, screenClass]
    .map(s => (s || '').toLowerCase().trim())
    .join('|');
  return simpleHash(normalized);
}

// Risk score calculation — each signal adds points, capped at 100.
// Signals:
//   same_installation_different_account: +40 — same installation_id, different user (STRONG)
//   same_environment_different_account: +25 — same env_hash, different user (MEDIUM)
//   same_ip_history: +5 — same IP, different user (WEAK — IP can be shared/NAT/VPN)
//   multiple_trials_short_time: +20 — >5 trials created in 24h
//   cookie_reset_suspected: +20 — installation_id changed for same env_hash (cleared cookies)
//
// NOTE: same installation_id + SAME user is a normal returning user, NOT a risk signal.
// NOTE: same_country_city is NOT scored — same city/country is not evidence of abuse.
//
// Levels: 0-30 low, 31-60 medium, 61-80 high, 81-100 critical
export function calculateRiskScore(signals) {
  let score = 0;
  const triggered = [];

  if (signals.sameInstallationDifferentAccount) { score += 40; triggered.push('same_installation_different_account'); }
  if (signals.sameEnvironmentDifferentAccount) { score += 25; triggered.push('same_environment_different_account'); }
  if (signals.sameIpHistory) { score += 5; triggered.push('same_ip_history'); }
  if (signals.multipleTrialsShortTime) { score += 20; triggered.push('multiple_trials_short_time'); }
  if (signals.cookieResetSuspected) { score += 20; triggered.push('cookie_reset_suspected'); }

  score = Math.min(score, 100);

  let level = 'low';
  if (score > 80) level = 'critical';
  else if (score > 60) level = 'high';
  else if (score > 30) level = 'medium';

  return { score, level, triggered };
}

// Geolocation from IP using ipwhois.app (free, HTTPS, no API key)
export async function getGeoFromIp(ip) {
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('10.') || ip === '::1') {
    return { country: '', countryCode: '', region: '', city: '', latitude: null, longitude: null };
  }
  try {
    const res = await fetch(`https://ipwhois.app/json/${ip}`);
    const data = await res.json();
    if (data.success) {
      return {
        country: data.country || '',
        countryCode: data.country_code || '',
        region: data.region || '',
        city: data.city || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null
      };
    }
  } catch {}
  return { country: '', countryCode: '', region: '', city: '', latitude: null, longitude: null };
}

// Extract client IP from request headers.
// Base44 production proxy chain: true-client-ip and the FIRST x-forwarded-for
// entry carry the real end-user IP; cf-connecting-ip / x-real-ip hold the
// upstream edge proxy IP. Priority: true-client-ip → x-forwarded-for[0]
// → cf-connecting-ip → x-real-ip → unknown.
export function getClientIp(headers) {
  const trueClientIp = headers.get('true-client-ip')?.trim();

  const forwardedFor = (headers.get('x-forwarded-for') || '')
    .split(',')
    .map(v => v.trim())
    .find(Boolean);

  const cfIp = headers.get('cf-connecting-ip')?.trim();
  const realIp = headers.get('x-real-ip')?.trim();

  return trueClientIp ||
    forwardedFor ||
    cfIp ||
    realIp ||
    'unknown';
}

// Format seconds as HH:MM:SS
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Heartbeat status from last_heartbeat_at timestamp
export function getHeartbeatStatus(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return 'none';
  const elapsed = (Date.now() - new Date(lastHeartbeatAt).getTime()) / 1000;
  if (elapsed > 30) return 'lost';
  if (elapsed > 15) return 'delayed';
  return 'ok';
}

// Shadow enforcement decision — informational only in Phase 1
export function getShadowDecision(trial, session) {
  if (!trial) return { decision: 'allow', reason: 'no_trial' };
  if (trial.status === 'blocked') return { decision: 'deny_blocked', reason: 'trial_blocked' };
  if (trial.playback_remaining_seconds <= 0 || trial.playback_used_seconds >= trial.trial_limit_seconds) {
    return { decision: 'deny_trial_expired', reason: 'trial_expired' };
  }
  if (trial.risk_score >= 81) return { decision: 'suspicious_repeat_trial', reason: 'high_risk_score' };
  if (session && session.end_reason === 'heartbeat_lost') {
    return { decision: 'deny_heartbeat_lost', reason: 'heartbeat_lost' };
  }
  return { decision: 'allow', reason: 'ok' };
}

// Format trial for frontend consumption
export function formatTrial(t) {
  return {
    id: t.id,
    status: t.status,
    trialLimitSeconds: t.trial_limit_seconds,
    playbackUsedSeconds: t.playback_used_seconds,
    playbackRemainingSeconds: t.playback_remaining_seconds,
    riskScore: t.risk_score,
    riskLevel: t.risk_level || '',
    riskSignals: t.risk_signals || '',
    shadowEnforcementDecision: t.shadow_enforcement_decision || '',
    createdAt: t.created_date,
    activatedAt: t.activated_at,
    lastActivityAt: t.last_activity_at,
    lastHeartbeatAt: t.last_heartbeat_at
  };
}