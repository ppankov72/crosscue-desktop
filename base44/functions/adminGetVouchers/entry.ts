// Admin: List vouchers with optional status filter.
// Admin-only.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'payments.view')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const statusFilter = String(body.status || '').trim();
    const campaignFilter = String(body.campaign || '').trim();

    let vouchers = await base44.asServiceRole.entities.Voucher.list('-created_date', 500);
    if (statusFilter) vouchers = vouchers.filter((v: any) => v.status === statusFilter);
    if (campaignFilter) vouchers = vouchers.filter((v: any) => (v.source_campaign || '') === campaignFilter);

    const overview = {
      total: vouchers.length,
      created: vouchers.filter((v: any) => v.status === 'created').length,
      sent: vouchers.filter((v: any) => v.status === 'sent').length,
      redeemed: vouchers.filter((v: any) => v.status === 'redeemed').length,
      revoked: vouchers.filter((v: any) => v.status === 'revoked').length,
      expired: vouchers.filter((v: any) => v.status === 'expired').length,
    };

    return Response.json({
      vouchers: vouchers.map((v: any) => ({
        id: v.id,
        voucher_code: v.voucher_code,
        voucher_type: v.voucher_type,
        entitlement_type: v.entitlement_type,
        status: v.status,
        recipient_email: v.recipient_email || '',
        recipient_dj_name: v.recipient_dj_name || '',
        message: v.message || '',
        source_campaign: v.source_campaign || '',
        created_by: v.created_by || '',
        redeemed_at: v.redeemed_at || '',
        redeemed_by: v.redeemed_by || '',
        redeemed_by_email: v.redeemed_by_email || '',
        entitlement_id: v.entitlement_id || '',
        expires_at: v.expires_at || '',
        max_uses: v.max_uses || 1,
        use_count: v.use_count || 0,
        created_date: v.created_date
      })),
      overview
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}