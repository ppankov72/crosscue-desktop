// Phase F — Security event logging helper.
// SINGLE source of truth for creating SecurityEvent records.
// Used by: confirmMyFeedLink, unlinkMyFeed, updateMyProfile, updateMyFeedSettings,
// revokeSession, revokeAllOtherSessions, revokeDevice.
//
// SECURITY: Never logs secrets, passwords, tokens, or authorization headers.
// Only logs: event type, user-safe description, device metadata, anonymized IP.

import { parseUA, getClientIp } from './trialSystem.ts';

// ============================================================
// EVENT TYPES
// ============================================================
export const SECURITY_EVENT_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  SESSION_REVOKED: 'session_revoked',
  SESSION_REVOKED_ALL: 'session_revoked_all',
  DEVICE_REGISTERED: 'device_registered',
  DEVICE_REVOKED: 'device_revoked',
  PROFILE_CHANGED: 'profile_changed',
  MYFEED_LINKED: 'myfeed_linked',
  MYFEED_UNLINKED: 'myfeed_unlinked',
  ENTITLEMENT_CHANGED: 'entitlement_changed',
  ROLE_CHANGED: 'role_changed',
  SECURITY_SETTING_CHANGED: 'security_setting_changed'
} as const;

// ============================================================
// IP ANONYMIZATION
// ============================================================
// Never store full IP — zero out last octet/group for privacy.
function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::0';
  }
  return 'unknown';
}

// ============================================================
// LOG SECURITY EVENT
// ============================================================
// Creates a SecurityEvent record via asServiceRole.
// Must be called from a backend function with base44 client.
//
// @param base44 - The base44 client (with asServiceRole)
// @param userId - The user ID this event belongs to
// @param eventType - One of SECURITY_EVENT_TYPES
// @param description - Human-readable, sanitized description (no secrets)
// @param req - The request object (for UA/IP extraction), optional
export async function logSecurityEvent(
  base44: any,
  userId: string,
  eventType: string,
  description: string,
  req?: any
): Promise<void> {
  try {
    let deviceType = '';
    let os = '';
    let browser = '';
    let ipAnonymized = 'unknown';

    if (req?.headers) {
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const parsed = parseUA(userAgent);
      deviceType = parsed.device || '';
      os = parsed.os || '';
      browser = parsed.browser || '';
      const rawIp = getClientIp(req.headers);
      ipAnonymized = anonymizeIp(rawIp);
    }

    // Sanitize description — strip any HTML, limit length
    const safeDescription = String(description || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>"'&]/g, '')
      .slice(0, 500)
      .trim();

    await base44.asServiceRole.entities.SecurityEvent.create({
      user_id: userId,
      event_type: eventType,
      description: safeDescription,
      device_type: deviceType,
      os,
      browser,
      ip_anonymized: ipAnonymized
    });
  } catch {
    // Security event logging is best-effort — must NOT block the caller
  }
}