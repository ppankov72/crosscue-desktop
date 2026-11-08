import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getConfiguredProvider } from '../../shared/paymentProvider.ts';
import { getPlan } from '../../shared/plans.ts';
import { getWeekendExpiry, getPremiumExpiry } from '../../shared/permissionSystem.ts';
import { waitUntil } from 'base44:runtime';
import { recordVerifiedPayment } from '../../shared/paymentMarketing.ts';

// Phase F — Payment webhook handler.
// Receives provider webhooks, verifies signature, processes payment events.
// Idempotent — duplicate events are detected and skipped.
// 
// Security:
// - Signature verification is MANDATORY
// - Raw body is stored for audit
// - Events are immutable once processed
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get the configured provider
    const provider = getConfiguredProvider();
    if (!provider || !provider.isConfigured) {
      return Response.json({ error: 'payment_provider_not_configured' }, { status: 503 });
    }

    // Get raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get('X-Webhook-Signature') || req.headers.get('Stripe-Signature') || '';
    const timestamp = req.headers.get('X-Webhook-Timestamp') || '';

    // Verify signature — MANDATORY
    let signatureValid = false;
    try {
      signatureValid = await provider.verifyWebhookSignature(rawBody, signature, timestamp);
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      // Log the failed attempt
      try {
        await base44.asServiceRole.entities.PaymentEvent.create({
          event_id: 'sig_fail_' + Date.now(),
          provider: provider.code,
          event_type: 'payment_failed',
          status: 'failed',
          failure_reason: 'invalid_signature',
          raw_payload: rawBody.substring(0, 5000),
          signature_valid: false
        });
      } catch {}
      return Response.json({ error: 'invalid_signature' }, { status: 401 });
    }

    // Parse the event
    let event;
    try {
      event = await provider.parseWebhookEvent(rawBody, signature);
    } catch (e: any) {
      return Response.json({ error: 'event_parse_failed', details: e.message }, { status: 400 });
    }

    // Skip merchant self-test charges from Base44
    if (event.rawEvent?.data?.object?.metadata?.base44_test_checkout === 'true') {
      return Response.json({ ok: true, skipped: 'base44_test_checkout' });
    }

    // Check for duplicate events (idempotency) strictly by unique Stripe Event ID (evt_...).
    // Resource IDs (sub_..., cs_..., in_...) MUST NEVER be used as idempotency keys,
    // because a single resource transitions through multiple lifecycle events.
    const webhookEventId = event.providerEventId || ('evt_fallback_' + Date.now() + '_' + crypto.randomUUID());
    const existing = await base44.asServiceRole.entities.PaymentEvent.filter(
      { event_id: webhookEventId, provider: provider.code },
      '-created_date', 1
    );
    if (existing.length > 0 && existing[0].status === 'processed') {
      waitUntil(recordVerifiedPayment(base44,event));
      return Response.json({ ok: true, duplicate: true, status: 'already_processed' });
    }

    // Store the event (immutable audit log)
    const eventRecord = await base44.asServiceRole.entities.PaymentEvent.create({
      event_id: webhookEventId,
      provider: provider.code,
      event_type: event.status === 'succeeded' ? 'payment_succeeded' :
                  event.status === 'failed' ? 'payment_failed' :
                  event.status === 'refunded' ? 'payment_refunded' :
                  'payment_canceled',
      order_id: event.orderId || '',
      payment_id: event.providerPaymentId,
      user_id: '',
      email: '',
      amount: event.amount || 0,
      currency: event.currency || 'EUR',
      status: 'received',
      raw_payload: rawBody.substring(0, 5000),
      signature_valid: true
    });

    // Process the event
    try {
      const paymentCreated = await processPaymentEvent(base44, event, eventRecord.id);
      
      // Mark as processed
      await base44.asServiceRole.entities.PaymentEvent.update(eventRecord.id, {
        status: 'processed',
        processed_at: new Date().toISOString()
      });

      // Record marketing analytics ONLY when a real payment was created
      if (paymentCreated) {
        waitUntil(recordVerifiedPayment(base44, event));
      }

      return Response.json({ ok: true, status: 'processed', paymentCreated });
    } catch (e: any) {
      // Mark as failed
      try {
        await base44.asServiceRole.entities.PaymentEvent.update(eventRecord.id, {
          status: 'failed',
          failure_reason: e.message
        });
      } catch {}
      return Response.json({ error: 'processing_failed', details: e.message }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// EVENT PROCESSING
// ============================================================
async function processPaymentEvent(base44: any, event: any, eventRecordId: string): Promise<boolean> {
  // Find the order — either from event.orderId or fallback by subscription/user
  let order = null;
  if (event.orderId) {
    try {
      order = await base44.asServiceRole.entities.Order.get(event.orderId);
    } catch {}
  }

  // If order wasn't found by ID directly, attempt to match via subscription
  if (!order && event.subscriptionId) {
    const matchedOrders = await base44.asServiceRole.entities.Order.filter(
      { payment_id: event.subscriptionId },
      '-created_date', 1
    );
    if (matchedOrders.length > 0) {
      order = matchedOrders[0];
    }
  }

  // Fallback by userId if still not found
  if (!order && event.userId) {
    const userOrders = await base44.asServiceRole.entities.Order.filter(
      { user_id: event.userId },
      '-created_date', 1
    );
    if (userOrders.length > 0) {
      order = userOrders[0];
    }
  }

  // If order still not found, handle subscription lifecycle if applicable
  if (!order) {
    if (event.subscriptionId || event.userId) {
      await handleSubscriptionLifecycle(base44, event);
      return false; // No payment created
    }
    throw new Error('order_not_found');
  }

  // Update the event record with order details
  await base44.asServiceRole.entities.PaymentEvent.update(eventRecordId, {
    user_id: order.user_id,
    email: order.email,
    order_id: order.id
  });

  const eventType = event.eventType || '';
  const planCode = order.plan_code || event.planCode || '';
  let paymentCreated = false;

  // 1. REFUND
  if (eventType === 'charge.refunded' || event.status === 'refunded') {
    await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'refunded'
    });
    const entitlements = await base44.asServiceRole.entities.Entitlement.filter(
      { user_id: order.user_id, status: 'active' },
      '-created_date', 10
    );
    const target = entitlements.find((e: any) =>
      e.license_reference === order.id ||
      (event.subscriptionId && e.payment_reference === event.subscriptionId) ||
      e.payment_reference === order.payment_id
    );
    if (target) {
      await base44.asServiceRole.entities.Entitlement.bulkUpdate([
        { id: target.id, status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: 'payment_refunded' }
      ]);
    }
    return false;
  }

  // 2. CHECKOUT EXPIRED
  if (eventType === 'checkout.session.expired') {
    if (order.status === 'pending') {
      await base44.asServiceRole.entities.Order.update(order.id, { status: 'canceled' });
    }
    return false;
  }

  // 3. SUBSCRIPTION LIFECYCLE (Updated / Deleted) - NEVER creates a Payment
  if (eventType === 'customer.subscription.deleted' || eventType === 'customer.subscription.updated') {
    await handleSubscriptionLifecycle(base44, event, order);
    return false;
  }

  // 4. CHECKOUT SESSION COMPLETED
  if (eventType === 'checkout.session.completed') {
    if (planCode === 'weekend') {
      // Weekend Pass is one-time payment-bearing
      const checkoutSessionId = event.providerPaymentId; // cs_...
      
      // 1. Search existing Payment by provider_payment_id = cs_...
      const existingPayments = await base44.asServiceRole.entities.Payment.filter(
        { provider_payment_id: checkoutSessionId },
        '-created_date', 5
      );

      let targetPayment = existingPayments.length > 0 ? existingPayments[0] : null;

      // 2. Backward-compatible fallback for orders created before this fix:
      if (!targetPayment) {
        const pendingPaymentsForOrder = await base44.asServiceRole.entities.Payment.filter(
          { order_id: order.id, status: 'pending' },
          '-created_date', 10
        );

        if (pendingPaymentsForOrder.length === 1) {
          targetPayment = pendingPaymentsForOrder[0];
        } else if (pendingPaymentsForOrder.length > 1) {
          console.error(`anomaly_multiple_pending_payments_for_order: ${order.id}, count: ${pendingPaymentsForOrder.length}`);
          return false;
        }
      }

      let paymentId = '';
      if (targetPayment) {
        // UPDATE existing payment - DO NOT create a second payment record
        const updatedAmount = event.amount || (typeof order.amount === 'number' ? Math.round(order.amount * 100) : targetPayment.amount);
        await base44.asServiceRole.entities.Payment.update(targetPayment.id, {
          provider_payment_id: checkoutSessionId,
          amount: updatedAmount,
          currency: event.currency ? event.currency.toUpperCase() : targetPayment.currency,
          status: 'succeeded',
          confirmed_at: new Date().toISOString(),
          webhook_event_id: eventRecordId,
          raw_provider_status: event.status
        });
        paymentId = targetPayment.id;
        paymentCreated = true;
      } else {
        // If no payment exists at all, create new succeeded payment
        const payment = await base44.asServiceRole.entities.Payment.create({
          order_id: order.id,
          user_id: order.user_id,
          email: order.email,
          provider: order.provider || 'stripe',
          provider_payment_id: checkoutSessionId,
          amount: event.amount || (typeof order.amount === 'number' ? Math.round(order.amount * 100) : 499),
          currency: (event.currency || order.currency || 'EUR').toUpperCase(),
          status: 'succeeded',
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          webhook_event_id: eventRecordId,
          raw_provider_status: event.status
        });
        paymentId = payment.id;
        paymentCreated = true;
      }

      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'paid',
        payment_id: paymentId,
        completed_at: new Date().toISOString()
      });

      // Grant weekend entitlement (72h)
      const existingEntitlements = await base44.asServiceRole.entities.Entitlement.filter(
        { user_id: order.user_id, status: 'active', type: 'weekend' },
        '-created_date', 5
      );
      const alreadyActive = existingEntitlements.find((e: any) =>
        e.license_reference === order.id || e.payment_reference === paymentId
      );
      if (!alreadyActive) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
        const entitlement = await base44.asServiceRole.entities.Entitlement.create({
          user_id: order.user_id,
          email: order.email,
          type: 'weekend',
          status: 'active',
          source: 'payment',
          starts_at: now.toISOString(),
          expires_at: expiresAt,
          payment_reference: paymentId,
          license_reference: order.id,
          manually_granted: false
        });
        await base44.asServiceRole.entities.Order.update(order.id, { entitlement_id: entitlement.id });
      }
      return paymentCreated;

    } else {
      // Premium Subscription:
      // DO NOT create a Payment record here!
      // Link the subscription ID to Order
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_id: event.subscriptionId || order.payment_id,
        completed_at: new Date().toISOString()
      });
      return false; // No payment created yet; waits for invoice payment event
    }
  }

  // 5. INVOICE PAYMENT (invoice.payment_succeeded / invoice.paid)
  // This is the true payment-bearing event for subscriptions
  if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid') {
    // Financial deduplication strictly by Stripe invoice resource ID (in_...)
    const invoiceResourceId = event.providerPaymentId; // in_...
    const existingPayments = await base44.asServiceRole.entities.Payment.filter(
      { provider_payment_id: invoiceResourceId },
      '-created_date', 1
    );

    let paymentId = existingPayments.length > 0 ? existingPayments[0].id : '';
    if (!paymentId) {
      const payment = await base44.asServiceRole.entities.Payment.create({
        order_id: order.id,
        user_id: order.user_id,
        email: order.email,
        provider: order.provider || 'stripe',
        provider_payment_id: invoiceResourceId,
        amount: event.amount || (typeof order.amount === 'number' ? Math.round(order.amount * 100) : 1299),
        currency: (event.currency || order.currency || 'EUR').toUpperCase(),
        status: 'succeeded',
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        webhook_event_id: eventRecordId,
        raw_provider_status: 'succeeded'
      });
      paymentId = payment.id;
      paymentCreated = true;
    }

    // Update order status to paid and ensure payment_id points to subscription
    await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'paid',
      payment_id: event.subscriptionId || order.payment_id || paymentId,
      completed_at: order.completed_at || new Date().toISOString()
    });

    // Check existing active Premium entitlement for this user/subscription
    const existingEntitlements = await base44.asServiceRole.entities.Entitlement.filter(
      { user_id: order.user_id, type: 'premium' },
      '-created_date', 10
    );

    const activeEnt = existingEntitlements.find((e: any) =>
      e.status === 'active' && (
        (event.subscriptionId && e.payment_reference === event.subscriptionId) ||
        e.license_reference === order.id
      )
    );

    const now = new Date();
    const newExpiry = getPremiumExpiry(now);

    if (activeEnt) {
      // Renewal or duplicate invoice event: update expiry without creating a second entitlement
      await base44.asServiceRole.entities.Entitlement.bulkUpdate([
        { id: activeEnt.id, expires_at: newExpiry, payment_reference: event.subscriptionId || activeEnt.payment_reference }
      ]);
    } else {
      // First payment: create active Premium entitlement
      const entitlement = await base44.asServiceRole.entities.Entitlement.create({
        user_id: order.user_id,
        email: order.email,
        type: 'premium',
        status: 'active',
        source: 'payment',
        starts_at: now.toISOString(),
        expires_at: newExpiry,
        payment_reference: event.subscriptionId || paymentId,
        license_reference: order.id,
        manually_granted: false
      });
      await base44.asServiceRole.entities.Order.update(order.id, { entitlement_id: entitlement.id });
    }

    return paymentCreated;
  }

  return false;
}

async function handleSubscriptionLifecycle(base44: any, event: any, order?: any) {
  if (!event.subscriptionId) return;

  const rawSubStatus = event.rawEvent?.data?.object?.status || '';
  const eventType = event.eventType || '';

  const entitlements = await base44.asServiceRole.entities.Entitlement.filter(
    { payment_reference: event.subscriptionId },
    '-created_date', 5
  );

  // If deleted, canceled or unpaid: expire entitlement
  if (eventType === 'customer.subscription.deleted' || rawSubStatus === 'canceled' || rawSubStatus === 'unpaid') {
    if (order && order.status !== 'canceled') {
      try { await base44.asServiceRole.entities.Order.update(order.id, { status: 'canceled' }); } catch {}
    }
    const toExpire = entitlements.filter((e: any) => e.status === 'active').map((e: any) => ({
      id: e.id,
      status: 'expired',
      revoked_at: new Date().toISOString(),
      revoke_reason: eventType === 'customer.subscription.deleted' ? 'subscription_canceled' : `subscription_${rawSubStatus}`
    }));
    if (toExpire.length > 0) {
      await base44.asServiceRole.entities.Entitlement.bulkUpdate(toExpire);
    }
  } else if (rawSubStatus === 'past_due') {
    // past_due: keep lifecycle recorded, do NOT revoke immediately (grace period / retry policy)
    // No entitlement change
  } else if (rawSubStatus === 'active' || rawSubStatus === 'trialing') {
    // active / trialing: Entitlement remains active
  }
}