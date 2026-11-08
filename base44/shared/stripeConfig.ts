// Stripe configuration — maps CROSSCUE plan codes to Stripe Price IDs.
// These IDs were created in the Stripe sandbox (test mode).
// Update them here if prices are recreated in Stripe.

// Known Sandbox price IDs that MUST NEVER be used in Live mode
export const SANDBOX_PRICE_IDS = new Set([
  'price_1UOy9u2Q4dHzk65iMEi0kbh2',
  'price_1UOy9v2Q4dHzk65iQU95LUvC',
  'price_1UEyHh2Q4dHzk65iAKrNOynU',
  'price_1UEyHi2Q4dHzk65itfuqf7U9'
]);

function getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') {
    return Deno.env.get(key);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function validateAndGetStripePriceId(planCode: string): string {
  const secretKey = getEnv('STRIPE_SECRET_KEY') || '';
  const isLiveStripe = secretKey.startsWith('sk_live_');

  const weekendEnv = getEnv('STRIPE_WEEKEND_PRICE_ID');
  const premiumEnv = getEnv('STRIPE_PREMIUM_PRICE_ID');
  const webhookSecret = getEnv('STRIPE_WEBHOOK_SECRET');

  if (isLiveStripe) {
    // Fail-closed requirement: in Live mode, secrets MUST be explicitly configured
    if (!weekendEnv || !premiumEnv || !webhookSecret) {
      throw new Error('live_payment_configuration_incomplete');
    }

    const livePriceId = planCode === 'weekend' ? weekendEnv : planCode === 'premium' ? premiumEnv : '';
    if (!livePriceId) {
      throw new Error(`no_stripe_price_for_plan:${planCode}`);
    }

    // Safety guard: ensure no known Sandbox price IDs are accidentally supplied in Live mode
    if (SANDBOX_PRICE_IDS.has(livePriceId)) {
      throw new Error('live_payment_configuration_incomplete: sandbox_price_id_in_live_mode');
    }

    return livePriceId;
  }

  // Sandbox mode: use env if provided, otherwise fallback to tested sandbox price IDs
  const sandboxPriceId = planCode === 'weekend'
    ? (weekendEnv || 'price_1UOy9u2Q4dHzk65iMEi0kbh2')
    : planCode === 'premium'
    ? (premiumEnv || 'price_1UOy9v2Q4dHzk65iQU95LUvC')
    : '';

  if (!sandboxPriceId) {
    throw new Error(`no_stripe_price_for_plan:${planCode}`);
  }

  return sandboxPriceId;
}

export const STRIPE_PRICE_IDS: Record<string, string> = {
  get weekend() { return validateAndGetStripePriceId('weekend'); },
  get premium() { return validateAndGetStripePriceId('premium'); }
};

export const STRIPE_PRODUCT_IDS: Record<string, string> = {
  weekend: 'prod_VFTEVFetdEF2nI',
  premium: 'prod_VFTEOAFk77mnE4'
};

export const STRIPE_API_VERSION = '2025-10-29.clover';
export const STRIPE_MANAGED_PAYMENTS_API_VERSION = '2026-02-25.preview';
export const STRIPE_API_BASE = 'https://api.stripe.com/v1';