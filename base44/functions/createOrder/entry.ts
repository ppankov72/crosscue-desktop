import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getPlan, getPlanPrice } from '../../shared/plans.ts';
import { getWeekendExpiry, getPremiumExpiry } from '../../shared/permissionSystem.ts';
import { getConfiguredProvider } from '../../shared/paymentProvider.ts';
import { waitUntil } from 'base44:runtime';
import { recordMarketingEvent } from '../../shared/marketingEvents.ts';

// Phase F — Create an Order with provider-neutral checkout.
// Server-side price determination — client CANNOT send a price.
// If a provider is configured, creates a checkout session.
// If no provider is configured, returns "coming soon" status.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const planCode = body.planCode || '';
    if (!planCode) return Response.json({ error: 'planCode required' }, { status: 400 });

    // Server-side plan lookup — NEVER trust client-supplied price
    const plan = getPlan(planCode);
    if (!plan) return Response.json({ error: 'invalid_plan' }, { status: 400 });
    if (plan.code === 'trial') return Response.json({ error: 'trial_is_free' }, { status: 400 });

    const amount = getPlanPrice(planCode); // authoritative price from central config
    const now = new Date().toISOString();

    // Get the configured payment provider
    const provider = getConfiguredProvider();
    const providerCode = provider?.code || 'pending_configuration';
    const providerReady = provider?.isConfigured || false;

    // Create Order with snapshot of plan details (price immutability)
    const order = await base44.asServiceRole.entities.Order.create({
      user_id: user.id,
      email: user.email,
      plan_id: planCode,
      plan_code: plan.code,
      plan_name: plan.name,
      amount,
      currency: plan.currency,
      status: 'pending',
      provider: providerCode,
      created_at_snapshot: now
    });

    // If provider is configured, create a checkout session
    if (providerReady && provider) {
      try {
        const origin = req.headers.get('Origin') || req.headers.get('Referer') || 'https://crosscue.app';
        const session = await provider.createCheckoutSession({
          orderId: order.id,
          amount,
          currency: plan.currency,
          planCode: plan.code,
          planName: plan.name,
          userEmail: user.email || '',
          userId: user.id,
          successUrl: `${origin}/portal?payment=success&order=${order.id}`,
          cancelUrl: `${origin}/portal?payment=canceled&order=${order.id}`
        });

        // Update order with provider session info
        await base44.asServiceRole.entities.Order.update(order.id, {
          provider: provider.code
        });

        // For one-time plans (Weekend Pass), create pending Payment record (amount in integer cents).
        // For subscription plans (Premium), do NOT create a Payment record here;
        // canonical financial Payment records are created exclusively by invoice.payment_succeeded.
        if (plan.interval === 'one_time' && plan.code !== 'premium') {
          await base44.asServiceRole.entities.Payment.create({
            order_id: order.id,
            user_id: user.id,
            email: user.email || '',
            provider: provider.code,
            provider_payment_id: session.providerPaymentId,
            amount: Math.round(amount * 100),
            currency: plan.currency,
            status: 'pending',
            created_at: now
          });
        }

        waitUntil(recordMarketingEvent(base44,{type:plan.code==='weekend'?'weekend_checkout_started':'premium_checkout_started',user,context:body.analytics||{},key:`checkout:${order.id}`,extra:{order_id:order.id,plan:plan.code,amount,currency:plan.currency,stripe_session_id:session.providerSessionId||'',livemode:session.livemode}}));
        return Response.json({
          orderId: order.id,
          planCode: plan.code,
          planName: plan.name,
          amount,
          currency: plan.currency,
          status: 'pending',
          paymentProviderReady: true,
          checkoutUrl: session.checkoutUrl,
          providerPaymentId: session.providerPaymentId
        });
      } catch (e: any) {
        // Provider failed — return order with provider error
        return Response.json({
          orderId: order.id,
          planCode: plan.code,
          planName: plan.name,
          amount,
          currency: plan.currency,
          status: 'pending',
          paymentProviderReady: false,
          providerError: e.message
        });
      }
    }

    // No provider configured — return "coming soon"
    return Response.json({
      orderId: order.id,
      planCode: plan.code,
      planName: plan.name,
      amount,
      currency: plan.currency,
      status: 'pending',
      paymentProviderReady: false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}