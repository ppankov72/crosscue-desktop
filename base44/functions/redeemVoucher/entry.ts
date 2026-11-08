// Redeem a voucher code. Requires authentication (entitlements are per-user).
// Creates an Entitlement starting NOW (3-day weekend starts at redemption, not creation).
// Marks the voucher as redeemed.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { canRedeem, computeEntitlementWindow } from '../../shared/vouchers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const code = String(body.voucher_code || '').trim().toUpperCase();

    if (!code) return Response.json({ error: 'code_required' }, { status: 400 });

    const vouchers = await base44.asServiceRole.entities.Voucher.filter({ voucher_code: code }, '-created_date', 1);
    if (vouchers.length === 0) return Response.json({ error: 'invalid_code' }, { status: 404 });

    const voucher = vouchers[0];
    const now = new Date();
    const check = canRedeem(voucher, now);
    if (!check.ok) {
      return Response.json({ error: check.reason }, { status: 400 });
    }

    // Create the entitlement — starts NOW
    const window = computeEntitlementWindow(voucher.entitlement_type);
    const entitlement = await base44.asServiceRole.entities.Entitlement.create({
      user_id: user.id,
      email: user.email || '',
      type: window.entType,
      status: 'active',
      source: 'promotional',
      starts_at: window.startsAt,
      expires_at: window.expiresAt,
      payment_reference: '',
      license_reference: voucher.voucher_code,
      manually_granted: false,
      granted_by: voucher.created_by || ''
    });

    // Mark voucher as redeemed
    const newUseCount = (voucher.use_count || 0) + 1;
    const fullyRedeemed = newUseCount >= (voucher.max_uses || 1);
    await base44.asServiceRole.entities.Voucher.update(voucher.id, {
      status: fullyRedeemed ? 'redeemed' : 'sent',
      redeemed_at: now.toISOString(),
      redeemed_by: user.id,
      redeemed_by_email: user.email || '',
      entitlement_id: entitlement.id,
      use_count: newUseCount
    });

    return Response.json({
      ok: true,
      entitlement_type: window.entType,
      starts_at: window.startsAt,
      expires_at: window.expiresAt,
      voucher_status: fullyRedeemed ? 'redeemed' : 'sent'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}