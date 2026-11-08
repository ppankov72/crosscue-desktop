// Phase B — Central permission system for playback control.
// This module is the SINGLE source of truth for playback permission decisions.
// Used by: getPlaybackPermission, trialHeartbeat, adminTrialAction

import { createHmac } from 'node:crypto';

// ============================================================
// CONFIGURATION — Phase B enforcement
// ============================================================
export const TRIAL_LIMIT_SECONDS = 2400;             // 40 minutes of active playback (free trial)
export const TRIAL_VALIDATION_INTERVAL_SECONDS = 5;  // heartbeat / permission check interval
export const NETWORK_GRACE_SECONDS = 3;              // grace period before locking on network loss
export const HEARTBEAT_TIMEOUT_SECONDS = 30;        // max time without heartbeat before session is stale
export const FADE_OUT_SECONDS = 2;                   // audio fade-out duration on lock
export const SHADOW_MODE = false;                    // Phase B: real enforcement
export const ENFORCEMENT_MODE = true;                // Phase B: real enforcement
export const WEEKEND_PASS_DURATION_HOURS = 72;       // 3 calendar days
export const WEEKEND_PASS_PRICE = 4.99;
export const PREMIUM_PRICE = 12.99;
export const PREMIUM_RENEWAL_DAYS = 30;

// Token lifetime — short-lived, refreshed on every heartbeat
export const TOKEN_LIFETIME_SECONDS = 8;

// ============================================================
// PERMISSION DECISION REASONS
// ============================================================
export const PERMISSION_REASONS = {
  ALLOW_TRIAL: 'trial_active',
  ALLOW_WEEKEND: 'weekend_active',
  ALLOW_PREMIUM: 'premium_active',
  ALLOW_ADMIN: 'admin_override',
  DENY_TRIAL_EXPIRED: 'trial_expired',
  DENY_TRIAL_BLOCKED: 'trial_blocked',
  DENY_NO_ENTITLEMENT: 'no_entitlement',
  DENY_LICENSE_EXPIRED: 'license_expired',
  DENY_NO_SERVER_CONNECTION: 'no_server_connection',
  DENY_SESSION_CONFLICT: 'session_conflict',
  DENY_VALIDATION_FAILED: 'validation_failed'
} as const;

// ============================================================
// SIGNED PLAYBACK TOKEN
// ============================================================
// Token = base64(payload).base64(hmac-sha256(payload, secret))
// Frontend cannot forge a valid token — signature is verified server-side.

function getSigningSecret(): string {
  return process.env.LICENSE_SIGNING_SECRET || 'crosscue-default-signing-key-change-me';
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

export interface TokenPayload {
  user_id: string;
  entitlement_type: string;
  trial_id: string;
  session_id: string;
  issued_at: number;
  valid_until: number;
  nonce: string;
}

export function signToken(payload: TokenPayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadStr);
  const signature = createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    // Verify signature
    const expectedSignature = createHmac('sha256', getSigningSecret())
      .update(payloadB64)
      .digest('base64url');
    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;

    // Check expiration (using server time, not client clock)
    const now = Date.now();
    if (now > payload.valid_until * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

export function generateNonce(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============================================================
// ENTITLEMENT EVALUATION
// ============================================================
// Priority: Premium > Weekend > Trial
// Returns the best active entitlement for a user.

export interface EntitlementRecord {
  id: string;
  user_id: string;
  type: string;
  status: string;
  starts_at: string;
  expires_at: string;
  trial_id: string;
  source: string;
}

export function evaluateEntitlement(entitlement: EntitlementRecord, serverTime: Date): { active: boolean; reason: string } {
  if (!entitlement) return { active: false, reason: 'no_entitlement' };
  if (entitlement.status === 'revoked') return { active: false, reason: 'entitlement_revoked' };
  if (entitlement.status === 'expired') return { active: false, reason: 'license_expired' };

  const now = serverTime.getTime();
  const startsAt = entitlement.starts_at ? new Date(entitlement.starts_at).getTime() : 0;
  const expiresAt = entitlement.expires_at ? new Date(entitlement.expires_at).getTime() : Infinity;

  if (now < startsAt) return { active: false, reason: 'entitlement_pending' };
  if (now > expiresAt) return { active: false, reason: 'license_expired' };

  return { active: true, reason: 'ok' };
}

export function pickBestEntitlement(entitlements: EntitlementRecord[], serverTime: Date): EntitlementRecord | null {
  const priority = { premium: 3, weekend: 2, trial: 1 };
  const active = entitlements.filter(e => evaluateEntitlement(e, serverTime).active);
  if (active.length === 0) return null;
  active.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
  return active[0];
}

// ============================================================
// TRIAL EVALUATION
// ============================================================
export interface TrialRecord {
  id: string;
  status: string;
  trial_limit_seconds: number;
  playback_used_seconds: number;
  playback_remaining_seconds: number;
  risk_score: number;
  risk_level: string;
}

export function evaluateTrial(trial: TrialRecord): { allowed: boolean; reason: string; remaining: number } {
  if (!trial) return { allowed: false, reason: 'no_entitlement', remaining: 0 };
  if (trial.status === 'blocked') return { allowed: false, reason: PERMISSION_REASONS.DENY_TRIAL_BLOCKED, remaining: 0 };
  if (trial.playback_remaining_seconds <= 0 || trial.playback_used_seconds >= trial.trial_limit_seconds) {
    return { allowed: false, reason: PERMISSION_REASONS.DENY_TRIAL_EXPIRED, remaining: 0 };
  }
  return { allowed: true, reason: PERMISSION_REASONS.ALLOW_TRIAL, remaining: trial.playback_remaining_seconds };
}

// ============================================================
// PERMISSION DECISION — The central function
// ============================================================
export interface PermissionContext {
  user: { id: string; email: string; role: string; custom_role?: string; account_status?: string; playback_override?: boolean };
  trial: TrialRecord | null;
  entitlements: EntitlementRecord[];
  sessionId: string | null;
  serverTime: Date;
}

export interface PermissionDecision {
  allowed: boolean;
  entitlementType: string;
  reason: string;
  remainingSeconds: number;
  serverTime: string;
  nextValidationInSeconds: number;
  trialId: string;
  sessionId: string;
  token: string;
  lockState: string;
}

export function decidePermission(ctx: PermissionContext): PermissionDecision {
  const { user, trial, entitlements, sessionId, serverTime } = ctx;
  const nextValidation = TRIAL_VALIDATION_INTERVAL_SECONDS;

  // 0. Account status check — blocked/suspended accounts are denied
  const accountStatus = user.account_status || 'active';
  if (accountStatus === 'blocked' || accountStatus === 'suspended' || accountStatus === 'deleted') {
    return buildDecision({
      allowed: false,
      entitlementType: 'none',
      reason: accountStatus === 'suspended' ? 'account_suspended' : 'account_blocked',
      remainingSeconds: 0,
      trialId: trial?.id || '',
      sessionId: sessionId || '',
      serverTime,
      nextValidation
    });
  }

  // 1. Playback override — EXPLICIT, separate from role.
  // Admin/owner with playback_override=true gets unlimited access.
  // This is NOT automatic — must be explicitly enabled and is audit-logged.
  if (user.playback_override === true) {
    return buildDecision({
      allowed: true,
      entitlementType: 'admin',
      reason: PERMISSION_REASONS.ALLOW_ADMIN,
      remainingSeconds: -1, // unlimited
      trialId: trial?.id || '',
      sessionId: sessionId || '',
      serverTime,
      nextValidation
    });
  }

  // 2. Check paid entitlements first (Premium > Weekend)
  const bestEntitlement = pickBestEntitlement(entitlements, serverTime);
  if (bestEntitlement) {
    if (bestEntitlement.type === 'premium') {
      return buildDecision({
        allowed: true,
        entitlementType: 'premium',
        reason: PERMISSION_REASONS.ALLOW_PREMIUM,
        remainingSeconds: -1,
        trialId: trial?.id || '',
        sessionId: sessionId || '',
        serverTime,
        nextValidation
      });
    }
    if (bestEntitlement.type === 'weekend') {
      const expiresAt = bestEntitlement.expires_at ? new Date(bestEntitlement.expires_at).getTime() : 0;
      const remaining = Math.max(0, Math.floor((expiresAt - serverTime.getTime()) / 1000));
      return buildDecision({
        allowed: true,
        entitlementType: 'weekend',
        reason: PERMISSION_REASONS.ALLOW_WEEKEND,
        remainingSeconds: remaining,
        trialId: trial?.id || bestEntitlement.trial_id || '',
        sessionId: sessionId || '',
        serverTime,
        nextValidation
      });
    }
  }

  // 3. Check Trial entitlement
  if (trial) {
    const trialEval = evaluateTrial(trial);
    if (trialEval.allowed) {
      return buildDecision({
        allowed: true,
        entitlementType: 'trial',
        reason: PERMISSION_REASONS.ALLOW_TRIAL,
        remainingSeconds: trialEval.remaining,
        trialId: trial.id,
        sessionId: sessionId || '',
        serverTime,
        nextValidation
      });
    }
    // Trial exists but is expired/blocked
    return buildDecision({
      allowed: false,
      entitlementType: 'trial',
      reason: trialEval.reason,
      remainingSeconds: 0,
      trialId: trial.id,
      sessionId: sessionId || '',
      serverTime,
      nextValidation
    });
  }

  // 4. No entitlement at all
  return buildDecision({
    allowed: false,
    entitlementType: 'none',
    reason: PERMISSION_REASONS.DENY_NO_ENTITLEMENT,
    remainingSeconds: 0,
    trialId: '',
    sessionId: sessionId || '',
    serverTime,
    nextValidation
  });
}

function buildDecision(params: {
  allowed: boolean;
  entitlementType: string;
  reason: string;
  remainingSeconds: number;
  trialId: string;
  sessionId: string;
  serverTime: Date;
  nextValidation: number;
}): PermissionDecision {
  const { allowed, entitlementType, reason, remainingSeconds, trialId, sessionId, serverTime, nextValidation } = params;

  // Issue a signed short-lived token
  const now = Date.now();
  const tokenPayload: TokenPayload = {
    user_id: '', // filled by caller
    entitlement_type: entitlementType,
    trial_id: trialId,
    session_id: sessionId,
    issued_at: Math.floor(now / 1000),
    valid_until: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS,
    nonce: generateNonce()
  };

  // We need user_id — but decidePermission has it in ctx. Let's pass it through.
  // Actually, we'll sign the token in the backend function where we have user.id.
  // For now, return an empty token — the caller will re-sign with user_id.
  const lockState = allowed ? 'unlocked' : 'locked';

  return {
    allowed,
    entitlementType,
    reason,
    remainingSeconds,
    serverTime: serverTime.toISOString(),
    nextValidationInSeconds: nextValidation,
    trialId,
    sessionId,
    token: '', // filled by caller with user_id
    lockState
  };
}

// Sign the final token with user_id included
export function signPermissionToken(decision: PermissionDecision, userId: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    user_id: userId,
    entitlement_type: decision.entitlementType,
    trial_id: decision.trialId,
    session_id: decision.sessionId,
    issued_at: Math.floor(now / 1000),
    valid_until: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS,
    nonce: generateNonce()
  };
  return signToken(payload);
}

// ============================================================
// STALE SESSION CLEANUP
// ============================================================
export function isSessionStale(lastHeartbeatAt: string, serverTime: Date): boolean {
  if (!lastHeartbeatAt) return true;
  const elapsed = (serverTime.getTime() - new Date(lastHeartbeatAt).getTime()) / 1000;
  return elapsed > HEARTBEAT_TIMEOUT_SECONDS;
}

// ============================================================
// WEEKEND PASS HELPERS
// ============================================================
export function getWeekendExpiry(startsAt: Date): string {
  return new Date(startsAt.getTime() + WEEKEND_PASS_DURATION_HOURS * 3600 * 1000).toISOString();
}

export function getPremiumExpiry(startsAt: Date): string {
  return new Date(startsAt.getTime() + PREMIUM_RENEWAL_DAYS * 24 * 3600 * 1000).toISOString();
}

// ============================================================
// IP ANONYMIZATION (for future use)
// ============================================================
export function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  // IPv4: zero out last octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  // IPv6: zero out last 3 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::0';
  }
  return ip;
}