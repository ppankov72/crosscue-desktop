// Voucher / gift-pass shared logic.
// Code generation, entitlement mapping, and validation.
// Used by: adminCreateVoucher, redeemVoucher, adminRevokeVoucher, adminGetVouchers.

import { WEEKEND_PASS_DURATION_HOURS } from './permissionSystem.ts';

export const VOUCHER_ENTITLEMENT_DURATIONS: Record<string, { type: string; hours: number }> = {
  weekend: { type: 'weekend', hours: WEEKEND_PASS_DURATION_HOURS }, // 72h
  premium_1m: { type: 'premium', hours: 30 * 24 },
  premium_3m: { type: 'premium', hours: 90 * 24 },
  premium_1y: { type: 'premium', hours: 365 * 24 },
};

// Generate a random alphanumeric segment of given length (uppercase, unambiguous chars)
function randomSegment(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1
  try {
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, v => chars[v % chars.length]).join('');
  } catch {
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

// Generate a voucher code: CC-WEEKEND-XXXX-XXXX (prefix depends on entitlement type)
export function generateVoucherCode(entitlementType: string): string {
  const prefix = entitlementType === 'weekend' ? 'CC-WEEKEND' :
    entitlementType === 'premium_1m' ? 'CC-PREMIUM-1M' :
    entitlementType === 'premium_3m' ? 'CC-PREMIUM-3M' :
    entitlementType === 'premium_1y' ? 'CC-PREMIUM-1Y' :
    'CC-PASS';
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`;
}

export function isValidVoucherCode(code: string): boolean {
  return /^CC-[A-Z0-9-]+-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code);
}

// Compute entitlement starts_at / expires_at for a redemption (starts NOW)
export function computeEntitlementWindow(entitlementType: string): { startsAt: string; expiresAt: string; entType: string } {
  const config = VOUCHER_ENTITLEMENT_DURATIONS[entitlementType] || VOUCHER_ENTITLEMENT_DURATIONS.weekend;
  const now = new Date();
  const expires = new Date(now.getTime() + config.hours * 3600 * 1000);
  return {
    startsAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    entType: config.type
  };
}

// Check if a voucher is redeemable
export function canRedeem(voucher: any, serverTime: Date): { ok: boolean; reason: string } {
  if (!voucher) return { ok: false, reason: 'not_found' };
  if (voucher.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (voucher.status === 'redeemed' && (voucher.max_uses || 1) <= (voucher.use_count || 0)) {
    return { ok: false, reason: 'already_redeemed' };
  }
  if (voucher.status === 'expired') return { ok: false, reason: 'expired' };
  if ((voucher.use_count || 0) >= (voucher.max_uses || 1)) return { ok: false, reason: 'max_uses_reached' };
  if (voucher.expires_at) {
    const exp = new Date(voucher.expires_at).getTime();
    if (serverTime.getTime() > exp) return { ok: false, reason: 'expired' };
  }
  return { ok: true, reason: 'ok' };
}