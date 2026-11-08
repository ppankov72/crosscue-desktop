import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Phase E — Get the authenticated user's own orders.
// Server-side ownership enforced — user A cannot see user B's orders.
// No payment secrets or internal provider data exposed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's own orders only — server-enforced
    const orders = await base44.asServiceRole.entities.Order.filter({ user_id: user.id }, '-created_date', 100);

    const safeOrders = orders.map(o => ({
      id: o.id,
      reference: o.id.slice(-8).toUpperCase(),
      plan_code: o.plan_code || '',
      plan_name: o.plan_name || '',
      amount: o.amount || 0,
      currency: o.currency || 'EUR',
      status: o.status || 'pending',
      created: o.created_at_snapshot || o.created_date || '',
      completed: o.completed_at || '',
      provider: o.provider === 'pending_configuration' ? 'pending' : 'configured'
    }));

    return Response.json({ orders: safeOrders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}