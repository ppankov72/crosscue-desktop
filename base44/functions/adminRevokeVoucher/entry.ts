// Admin: Revoke an unused voucher. Sets status to 'revoked'.
// Admin-only. Does NOT affect already-redeemed entitlements.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'entitlements.revoke')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const voucherId = String(body.voucher_id || '');
    const reason = String(body.reason || 'revoked_by_admin').slice(0, 500);

    if (!voucherId) return Response.json({ error: 'voucher_id_required' }, { status: 400 });

    const voucher = await base44.asServiceRole.entities.Voucher.get(voucherId);
    if (!voucher) return Response.json({ error: 'not_found' }, { status: 404 });

    if (voucher.status === 'redeemed') {
      return Response.json({ error: 'already_redeemed' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Voucher.update(voucherId, {
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoke_reason: reason
    });

    return Response.json({ ok: true, status: 'revoked' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}