// Phase F — Provider-neutral payment adapter interface.
// SINGLE source of truth for payment provider abstraction.
// Used by: createOrder, confirmPayment, webhook handlers.
//
// Architecture:
// - Order entity: provider-neutral record of intent
// - Payment entity: provider-specific payment record
// - PaymentEvent entity: immutable webhook event log
// - PaymentProvider adapter: pluggable provider implementation
//
// Currently supported providers:
// - "pending_configuration" — no provider configured yet
// - Future: stripe, wix_payments, etc.

import { STRIPE_PRICE_IDS, validateAndGetStripePriceId, STRIPE_API_VERSION, STRIPE_MANAGED_PAYMENTS_API_VERSION, STRIPE_API_BASE } from './stripeConfig.ts';

// ============================================================
// PAYMENT PROVIDER INTERFACE
// ============================================================
export interface PaymentProvider {
  code: string;
  name: string;
  isConfigured: boolean;
  
  // Create a checkout session / payment intent
  createCheckoutSession(params: {
    orderId: string;
    amount: number;
    currency: string;
    planCode: string;
    planName: string;
    userEmail: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{
    checkoutUrl: string;
    providerPaymentId: string;
    providerSessionId: string;
    livemode?: boolean;
  }>;
  
  // Verify a webhook signature
  verifyWebhookSignature(payload: string, signature: string, timestamp?: string): Promise<boolean>;
  
  // Parse a webhook event
  parseWebhookEvent(payload: string, signature: string): Promise<WebhookEvent>;
  
  // Get payment status from provider
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  
  // Create a refund
  createRefund(params: {
    providerPaymentId: string;
    amount: number;
    reason: string;
  }): Promise<{ refundId: string; status: string }>;
}

export interface WebhookEvent {
  providerPaymentId: string;
  providerEventId?: string;
  orderId: string;
  status: "succeeded" | "failed" | "refunded" | "canceled";
  amount: number;
  currency: string;
  rawEvent: any;
  subscriptionId?: string;
  userId?: string;
  planCode?: string;
  eventType?: string;
}

export interface PaymentStatusResult {
  status: "succeeded" | "failed" | "refunded" | "canceled" | "pending";
  amount: number;
  currency: string;
}

// ============================================================
// PROVIDER REGISTRY
// ============================================================
const providers: Record<string, PaymentProvider> = {};

export function registerProvider(provider: PaymentProvider): void {
  providers[provider.code] = provider;
}

export function getProvider(code: string): PaymentProvider | null {
  return providers[code] || null;
}

export function getConfiguredProvider(): PaymentProvider | null {
  for (const code of Object.keys(providers)) {
    const provider = providers[code];
    if (provider.isConfigured) return provider;
  }
  return null;
}

export function getAvailableProviders(): PaymentProvider[] {
  return Object.values(providers);
}

// ============================================================
// STRIPE PROVIDER (Test Mode)
// ============================================================
class StripeProvider implements PaymentProvider {
  code = "stripe";
  name = "Stripe";

  get isConfigured(): boolean {
    return Boolean(Deno.env.get("STRIPE_SECRET_KEY"));
  }

  private get secretKey(): string {
    return Deno.env.get("STRIPE_SECRET_KEY") || "";
  }

  async createCheckoutSession(params: {
    orderId: string;
    amount: number;
    currency: string;
    planCode: string;
    planName: string;
    userEmail: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; providerPaymentId: string; providerSessionId: string; livemode?: boolean }> {
    const priceId = validateAndGetStripePriceId(params.planCode);
    if (!priceId) throw new Error(`no_stripe_price_for_plan:${params.planCode}`);
    const isSubscription = params.planCode === 'premium';
    const mode = isSubscription ? 'subscription' : 'payment';
    const appId = Deno.env.get("BASE44_APP_ID") || '';

    const body = new URLSearchParams();
    body.append('mode', mode);
    body.append('line_items[0][price]', priceId);
    body.append('line_items[0][quantity]', '1');
    body.append('success_url', params.successUrl);
    body.append('cancel_url', params.cancelUrl);
    body.append('client_reference_id', params.orderId);
    body.append('managed_payments[enabled]', 'true');
    body.append('metadata[order_id]', params.orderId);
    body.append('metadata[plan_code]', params.planCode);
    if (params.userId) body.append('metadata[user_id]', params.userId);
    body.append('metadata[base44_app_id]', appId);
    if (params.userEmail) body.append('customer_email', params.userEmail);
    if (isSubscription) {
      body.append('subscription_data[metadata][order_id]', params.orderId);
      body.append('subscription_data[metadata][plan_code]', params.planCode);
      if (params.userId) body.append('subscription_data[metadata][user_id]', params.userId);
      body.append('subscription_data[metadata][base44_app_id]', appId);
    }

    const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Stripe-Version': STRIPE_MANAGED_PAYMENTS_API_VERSION,
        'Idempotency-Key': crypto.randomUUID(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'stripe_checkout_failed');
    return {
      checkoutUrl: json.url,
      providerPaymentId: json.id,
      providerSessionId: json.id,
      livemode: json.livemode
    };
  }

  async verifyWebhookSignature(payload: string, signature: string, _timestamp?: string): Promise<boolean> {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    if (!secret || !signature) return false;
    const parts = signature.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    if (!tPart || !v1Part) return false;
    const t = tPart.slice(2);
    const v1 = v1Part.slice(3);
    const signedPayload = `${t}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (computed.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  }

  async parseWebhookEvent(payload: string, _signature: string): Promise<WebhookEvent> {
    const event = JSON.parse(payload);
    const obj = event.data?.object || {};
    const eventType = event.type || '';

    // Extract metadata from session, invoice, or subscription
    const orderId =
      obj.metadata?.order_id ||
      obj.lines?.data?.[0]?.metadata?.order_id ||
      obj.client_reference_id ||
      '';

    const userId =
      obj.metadata?.user_id ||
      obj.lines?.data?.[0]?.metadata?.user_id ||
      '';

    const planCode =
      obj.metadata?.plan_code ||
      obj.lines?.data?.[0]?.metadata?.plan_code ||
      '';

    const subscriptionId =
      obj.subscription ||
      obj.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
      (typeof obj.subscription_details?.subscription === 'string' ? obj.subscription_details.subscription : '') ||
      (obj.object === 'subscription' ? obj.id : '') ||
      '';
    const providerPaymentId = obj.id || event.id;

    let status: "succeeded" | "failed" | "refunded" | "canceled" = "canceled";

    if (eventType === 'checkout.session.completed' || eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid') {
      status = "succeeded";
    } else if (eventType === 'checkout.session.expired' || eventType === 'customer.subscription.deleted') {
      status = "canceled";
    } else if (eventType === 'customer.subscription.updated') {
      const subStatus = obj.status;
      if (subStatus === 'active' || subStatus === 'trialing') {
        status = "succeeded";
      } else if (subStatus === 'canceled' || subStatus === 'unpaid') {
        status = "canceled";
      } else if (subStatus === 'past_due') {
        status = "failed";
      } else {
        status = "canceled";
      }
    } else if (eventType === 'charge.refunded') {
      status = "refunded";
    }

    const amount = obj.amount_total || obj.amount_paid || obj.amount_refunded || (obj.plan?.amount) || 0;
    const currency = obj.currency || 'eur';

    return {
      providerPaymentId,
      providerEventId: event.id || '',
      orderId,
      status,
      amount,
      currency,
      rawEvent: event,
      subscriptionId,
      userId,
      planCode,
      eventType
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${providerPaymentId}`, {
      headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Stripe-Version': STRIPE_API_VERSION }
    });
    const json = await res.json();
    if (!res.ok) return { status: 'pending', amount: 0, currency: 'eur' };
    const statusMap: Record<string, string> = { 'complete': 'succeeded', 'expired': 'canceled', 'open': 'pending' };
    return {
      status: (statusMap[json.status] || 'pending') as PaymentStatusResult['status'],
      amount: json.amount_total || 0,
      currency: json.currency || 'eur'
    };
  }

  async createRefund(params: { providerPaymentId: string; amount: number; reason: string }): Promise<{ refundId: string; status: string }> {
    const body = new URLSearchParams();
    body.append('payment_intent', params.providerPaymentId);
    if (params.amount) body.append('amount', String(params.amount));
    if (params.reason) body.append('reason', params.reason);
    const res = await fetch(`${STRIPE_API_BASE}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        'Idempotency-Key': crypto.randomUUID(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'stripe_refund_failed');
    return { refundId: json.id, status: json.status };
  }
}

// ============================================================
// PENDING CONFIGURATION PROVIDER
// ============================================================
// Default provider when no real provider is configured.
// Returns "coming soon" responses.
class PendingConfigurationProvider implements PaymentProvider {
  code = "pending_configuration";
  name = "Coming Soon";
  isConfigured = false;
  
  async createCheckoutSession(): Promise<any> {
    throw new Error("payment_provider_not_configured");
  }
  
  async verifyWebhookSignature(): Promise<boolean> {
    return false;
  }
  
  async parseWebhookEvent(): Promise<WebhookEvent> {
    throw new Error("payment_provider_not_configured");
  }
  
  async getPaymentStatus(): Promise<PaymentStatusResult> {
    return { status: "pending", amount: 0, currency: "EUR" };
  }
  
  async createRefund(): Promise<any> {
    throw new Error("payment_provider_not_configured");
  }
}

// Register the default pending provider
registerProvider(new PendingConfigurationProvider());
// Register the Stripe provider (active when STRIPE_SECRET_KEY is set)
registerProvider(new StripeProvider());