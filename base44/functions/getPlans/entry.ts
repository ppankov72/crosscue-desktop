import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAllPlans } from '../../shared/plans.ts';

// List all active plans. Public endpoint — used by landing page pricing section.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Try to read from Plan entity first (DB-driven config)
    let plans = [];
    try {
      const dbPlans = await base44.asServiceRole.entities.Plan.filter({ active: true }, 'sort_order', 50);
      if (dbPlans.length > 0) {
        plans = dbPlans.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          price: p.price,
          currency: p.currency,
          interval: p.interval,
          duration_hours: p.duration_hours,
          entitlement_type: p.entitlement_type,
          trial_seconds: p.trial_seconds,
          sort_order: p.sort_order
        }));
      }
    } catch {}

    // Fallback to central config if DB is empty
    if (plans.length === 0) {
      plans = getAllPlans();
    }

    return Response.json({ plans });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}