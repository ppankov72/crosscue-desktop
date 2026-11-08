import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';
import { getConfiguredProvider, getAvailableProviders } from '../../shared/paymentProvider.ts';

// Admin: Get commerce data (orders, payments, subscriptions).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'payments.view')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 200);
    const payments = await base44.asServiceRole.entities.Payment.list('-created_date', 200);
    const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 200);
    const plans = await base44.asServiceRole.entities.Plan.list('sort_order', 50);
    
    // Payment events (webhook log)
    let paymentEvents = [];
    try {
      paymentEvents = await base44.asServiceRole.entities.PaymentEvent.list('-created_date', 50);
    } catch {}

    return Response.json({
      orders: orders.map((o: any) => ({
        id: o.id,
        user_id: o.user_id,
        email: o.email,
        plan_code: o.plan_code,
        plan_name: o.plan_name,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
        provider: o.provider || '',
        created_at: o.created_at_snapshot,
        completed_at: o.completed_at,
        payment_id: o.payment_id || '',
        entitlement_id: o.entitlement_id || ''
      })),
      payments: payments.map((p: any) => ({
        id: p.id,
        order_id: p.order_id,
        user_id: p.user_id,
        email: p.email,
        provider: p.provider,
        provider_payment_id: p.provider_payment_id || '',
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        created_at: p.created_at,
        confirmed_at: p.confirmed_at,
        failure_reason: p.failure_reason || ''
      })),
      subscriptions: subscriptions.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        email: s.email,
        plan_code: s.plan_code,
        provider: s.provider,
        provider_subscription_id: s.provider_subscription_id || '',
        status: s.status,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end,
        canceled_at: s.canceled_at
      })),
      plans: plans.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        active: p.active
      })),
      paymentEvents: paymentEvents.map((e: any) => ({
        id: e.id,
        event_id: e.event_id,
        provider: e.provider,
        event_type: e.event_type,
        order_id: e.order_id,
        amount: e.amount,
        currency: e.currency,
        status: e.status,
        processed_at: e.processed_at,
        signature_valid: e.signature_valid,
        failure_reason: e.failure_reason || ''
      })),
      paymentProvider: {
        configured: getConfiguredProvider()?.isConfigured || false,
        code: getConfiguredProvider()?.code || 'pending_configuration',
        name: getConfiguredProvider()?.name || 'Not Configured',
        available: getAvailableProviders().map(p => ({ code: p.code, name: p.name, configured: p.isConfigured }))
      },
      paymentProviderReady: getConfiguredProvider()?.isConfigured || false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}