// Phase C — Central Plan configuration.
// SINGLE source of truth for plan prices, durations, and entitlement mapping.
// Used by: createOrder, getPlans, admin functions, frontend pricing display.

import { TRIAL_LIMIT_SECONDS, WEEKEND_PASS_DURATION_HOURS, WEEKEND_PASS_PRICE, PREMIUM_PRICE, PREMIUM_RENEWAL_DAYS } from './permissionSystem.ts';

export interface PlanConfig {
  code: string;
  name: string;
  price: number;
  currency: string;
  interval: 'one_time' | 'monthly';
  durationHours: number;
  entitlementType: 'trial' | 'weekend' | 'premium';
  trialSeconds: number;
  sortOrder: number;
}

// ============================================================
// CENTRAL PLAN CONFIGURATION
// ============================================================
// These values are the authoritative source. Do NOT hardcode 4.99, 12.99, 14400, 72h elsewhere.
export const PLANS: Record<string, PlanConfig> = {
  trial: {
    code: 'trial',
    name: 'Full Trial',
    price: 0,
    currency: 'EUR',
    interval: 'one_time',
    durationHours: 0,
    entitlementType: 'trial',
    trialSeconds: TRIAL_LIMIT_SECONDS, // 2400 (40 minutes of active playback)
    sortOrder: 0
  },
  weekend: {
    code: 'weekend',
    name: 'Weekend Pass',
    price: WEEKEND_PASS_PRICE, // 4.99
    currency: 'EUR',
    interval: 'one_time',
    durationHours: WEEKEND_PASS_DURATION_HOURS, // 72
    entitlementType: 'weekend',
    trialSeconds: 0,
    sortOrder: 1
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    price: PREMIUM_PRICE, // 12.99
    currency: 'EUR',
    interval: 'monthly',
    durationHours: PREMIUM_RENEWAL_DAYS * 24, // 720
    entitlementType: 'premium',
    trialSeconds: 0,
    sortOrder: 2
  }
};

export function getPlan(code: string): PlanConfig | null {
  return PLANS[code] || null;
}

export function getPlanPrice(code: string): number {
  const plan = getPlan(code);
  return plan ? plan.price : 0;
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Sync plans to the Plan entity (for admin visibility / future DB-driven config)
export async function syncPlans(base44: any): Promise<void> {
  const existing = await base44.asServiceRole.entities.Plan.list('-created_date', 50);
  for (const planConfig of getAllPlans()) {
    const exists = existing.find((p: any) => p.code === planConfig.code);
    const data = {
      code: planConfig.code,
      name: planConfig.name,
      price: planConfig.price,
      currency: planConfig.currency,
      interval: planConfig.interval,
      duration_hours: planConfig.durationHours,
      entitlement_type: planConfig.entitlementType,
      trial_seconds: planConfig.trialSeconds,
      active: true,
      sort_order: planConfig.sortOrder
    };
    if (exists) {
      try { await base44.asServiceRole.entities.Plan.update(exists.id, data); } catch {}
    } else {
      try { await base44.asServiceRole.entities.Plan.create(data); } catch {}
    }
  }
}