// Admin: Create one or more vouchers (gift/prize passes).
// Admin-only. Generates random non-sequential codes.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';
import { generateVoucherCode } from '../../shared/vouchers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'entitlements.grant')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}

    const entitlementType = String(body.entitlement_type || 'weekend');
    const voucherType = String(body.voucher_type || 'gift_voucher');
    const quantity = Math.min(50, Math.max(1, Math.round(Number(body.quantity) || 1)));
    const recipientEmail = String(body.recipient_email || '').trim().toLowerCase();
    const recipientDjName = String(body.recipient_dj_name || '').trim();
    const message = String(body.message || '').slice(0, 1000);
    const sourceCampaign = String(body.source_campaign || '').slice(0, 200);
    const expiresAt = String(body.expires_at || '').trim();
    const maxUses = Math.max(1, Math.round(Number(body.max_uses) || 1));

    const validEntitlements = ['weekend', 'premium_1m', 'premium_3m', 'premium_1y'];
    if (!validEntitlements.includes(entitlementType)) return Response.json({ error: 'invalid_entitlement_type' }, { status: 400 });

    const validVoucherTypes = ['gift_voucher', 'contest_prize', 'promotional_pass', 'partner_pass', 'community_prize'];
    if (!validVoucherTypes.includes(voucherType)) return Response.json({ error: 'invalid_voucher_type' }, { status: 400 });

    const created = [];
    for (let i = 0; i < quantity; i++) {
      let code = generateVoucherCode(entitlementType);
      // Ensure uniqueness (retry on collision)
      let attempts = 0;
      while (attempts < 5) {
        const existing = await base44.asServiceRole.entities.Voucher.filter({ voucher_code: code }, '-created_date', 1);
        if (existing.length === 0) break;
        code = generateVoucherCode(entitlementType);
        attempts++;
      }
      const voucher = await base44.asServiceRole.entities.Voucher.create({
        voucher_code: code,
        voucher_type: voucherType,
        entitlement_type: entitlementType,
        status: 'created',
        recipient_email: recipientEmail,
        recipient_dj_name: recipientDjName,
        message,
        source_campaign: sourceCampaign,
        created_by: user.id,
        expires_at: expiresAt || '',
        max_uses: maxUses,
        use_count: 0
      });
      created.push({
        id: voucher.id,
        voucher_code: code,
        entitlement_type: entitlementType,
        voucher_type: voucherType,
        status: 'created'
      });
    }

    return Response.json({ created: true, vouchers: created, count: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}