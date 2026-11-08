const definitions=[
  ['landing_view','Landing'],
  ['launch_clicked','Launch'],
  ['signup_completed','Signup'],
  ['trial_started','Trial Started'],
  ['trial_playback_10min','Trial Engaged'],
  ['checkout','Checkout'],
  ['payment_succeeded','Paid']
];

export function buildMarketingFunnel(events, orders) {
  const accounts = new Map();
  for (const e of events) {
    const anon = e.anonymous_id || e.installation_id;
    if (anon && anon !== 'unknown' && e.user_id) {
      if (!accounts.has(anon)) accounts.set(anon, new Set());
      accounts.get(anon).add(e.user_id);
    }
  }
  const person = e => {
    const anon = e.anonymous_id || e.installation_id;
    const users = accounts.get(anon);
    return e.user_id ? 'u:' + e.user_id : users?.size === 1 ? 'u:' + Array.from(users)[0] : anon && anon !== 'unknown' ? 'a:' + anon : 'event:' + e.id;
  };

  const sets = definitions.map(() => new Map());
  const weekend = new Set();
  const premium = new Set();
  const add = (step, id, time) => {
    const previous = sets[step].get(id);
    if (previous === undefined || time < previous) sets[step].set(id, time);
  };

  const ordersById = new Map((orders || []).map(o => [o.id, o]));
  const paidOrders = (orders || []).filter(o => o.status === 'paid');

  for (const e of events) {
    let type = e.event_type;
    if (type === 'pageview' && ['/', '/landing'].includes(e.page)) type = 'landing_view';
    if (type === 'signup') type = 'signup_completed';

    // Strictly validate payment_succeeded events:
    // A payment_succeeded event alone is NOT sufficient if its linked order is canceled or not paid.
    if (type === 'payment_succeeded') {
      const linkedOrder = e.order_id ? ordersById.get(e.order_id) : null;
      if (!linkedOrder || linkedOrder.status !== 'paid') {
        // Exclude payment_succeeded events whose order is canceled or not confirmed paid
        continue;
      }
    }

    const id = person(e);
    const time = Date.parse(e.timestamp || e.created_date) || 0;
    let step = definitions.findIndex(([key]) => key === type);
    if (['weekend_checkout_started', 'premium_checkout_started'].includes(type)) {
      step = 5;
      (type === 'weekend_checkout_started' ? weekend : premium).add(id);
    }
    if (step >= 0) add(step, id, time);
  }

  // Add confirmed paid orders to step 6 (Paid) with identity deduplication
  for (const o of paidOrders) {
    add(6, o.user_id ? 'u:' + o.user_id : 'order:' + o.id, Date.parse(o.completed_at || o.created_date) || 0);
  }

  const stages = definitions.map(([key, label], i) => {
    const current = sets[i];
    const previous = sets[i - 1];
    let converted = 0;
    if (previous) {
      for (const [id, time] of current) {
        if (previous.has(id) && time >= previous.get(id)) converted++;
      }
    }
    return {
      key,
      label,
      visitors: current.size,
      converted_from_previous: i ? converted : null,
      conversion_rate: i && previous.size ? converted / previous.size : null
    };
  });

  return {
    stages,
    checkout: { weekend: weekend.size, premium: premium.size },
    unique_customers: sets[6].size,
    paid_orders: paidOrders.length,
    definition: 'Unique visitors per observed stage; adjacent conversion requires the same visitor in chronological order. Paid stage requires verified paid orders (canceled orders excluded).'
  };
}