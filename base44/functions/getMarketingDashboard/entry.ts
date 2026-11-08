import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { trafficContext,classificationFor,trafficMeta,classifyEvent,entityPages } from '../../shared/trafficClassifier.ts';
import { buildMarketingFunnel } from '../../shared/marketingFunnel.ts';

// Marketing Dashboard — aggregates data from existing CROSSCUE systems (read-only).
// Reads: AnalyticsEvent (UTM attribution, funnel events), Order (revenue),
//        Voucher (reward campaigns), and Marketing* entities.
// Does NOT modify any protected system.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // ── Load marketing entities ──────────────────────────────
    const campaigns = await base44.asServiceRole.entities.MarketingCampaign.list('-created_date', 500);
    const links = await base44.asServiceRole.entities.CampaignLink.list('-created_date', 500);
    const submissions = await base44.asServiceRole.entities.CommunitySubmission.list('-created_date', 500);
    const intelligence = await base44.asServiceRole.entities.MarketIntelligence.list('-created_date', 200);
    const lessons = await base44.asServiceRole.entities.CampaignLesson.list('-created_date', 200);

    // ── Load analytics events for attribution ─────────────────
    const events=[];
    for await(const page of entityPages(base44.asServiceRole.entities.AnalyticsEvent))events.push(...page);

    // ── Load orders for revenue attribution ──────────────────
    let orders: any[] = [];
    try { for await(const page of entityPages(base44.asServiceRole.entities.Order))orders.push(...page); } catch {}

    // ── Load vouchers for reward attribution ─────────────────
    let vouchers: any[] = [];
    try { vouchers = await base44.asServiceRole.entities.Voucher.list('-created_date', 1000); } catch {}

    // ── Load payments & payment events for live/test financial mode separation ─
    let paymentEvents: any[] = [];
    try { for await(const page of entityPages(base44.asServiceRole.entities.PaymentEvent)) paymentEvents.push(...page); } catch {}

    let payments: any[] = [];
    try { for await(const page of entityPages(base44.asServiceRole.entities.Payment)) payments.push(...page); } catch {}

    const body=await req.json();
    const filter=['all','real','compare'].includes(body.traffic_filter)?body.traffic_filter:'real';
    const context=await trafficContext(base44);
    const allEvents=events.map(e=>({...e,...classificationFor(e,context)}));
    const realEvents=allEvents.filter(e=>e.traffic_class==='real');
    const realOrders=orders.filter(o=> {
      const user=context.byId.get(o.user_id)||context.byEmail.get((o.email||'').toLowerCase())||{id:o.user_id};
      const recorded=allEvents.find(e=>e.order_id===o.id&&['payment_succeeded','weekend_checkout_started','premium_checkout_started'].includes(e.event_type));
      if(recorded&&recorded.traffic_class!=='real')return false;
      const classification=classifyEvent(user,'','','',{},context.rules,{environment:context.orderModes.get(o.id)});
      return classification.traffic_class==='real';
    });
    const getOrderPaymentMode = (order: any): 'live' | 'test' | 'unknown' => {
      // 1. Check PaymentEvent records for order
      const pe = paymentEvents.filter((p: any) => p.order_id === order.id);
      for (const p of pe) {
        if (p.event_id?.startsWith('evt_test_') || p.provider_payment_id?.startsWith('cs_test_') || p.provider_payment_id?.startsWith('in_test_') || p.provider_payment_id?.includes('_test_')) return 'test';
        try {
          const raw = JSON.parse(p.raw_payload || '{}');
          if (raw.livemode === true) return 'live';
          if (raw.livemode === false) return 'test';
        } catch {}
      }

      // 2. Check Payment records for order
      const pm = payments.filter((p: any) => p.order_id === order.id);
      for (const p of pm) {
        const pid = String(p.provider_payment_id || '');
        if (pid.startsWith('cs_test_') || pid.startsWith('in_test_') || pid.includes('_test_')) return 'test';
        if (p.raw_provider_status === 'test' || p.failure_reason === 'test_mode') return 'test';
      }

      // 3. Check AnalyticsEvent records for order
      const oe = events.filter((e: any) => e.order_id === order.id);
      for (const e of oe) {
        if (e.environment === 'stripe_test') return 'test';
        let custom: any = {};
        try { custom = JSON.parse(e.custom_data || '{}'); } catch {}
        if (custom.livemode === true) return 'live';
        if (custom.livemode === false) return 'test';
        if (String(custom.stripe_session_id || '').startsWith('cs_test_')) return 'test';
      }

      // 4. Check context.orderModes
      const om = context.orderModes?.get(order.id);
      if (om === 'stripe_test') return 'test';
      if (om === 'production') return 'live';

      // 5. Default: unknown (NEVER assume live!)
      return 'unknown';
    };

    const aggregate=(events,orders)=> {
    // ── Build campaign code → campaign_id map ────────────────
    const codeToCampaign = new Map();
    for (const c of campaigns) {
      const codes = [c.internal_code, c.campaign_code].filter(Boolean);
      for (const code of codes) {
        if (!codeToCampaign.has(code)) codeToCampaign.set(code, c);
      }
    }

    // ── Per-campaign attribution from analytics events ───────
    // Group events by utm_campaign or campaign_code match
    const campaignStats = new Map(); // campaign_id → stats

    for (const c of campaigns) {
      campaignStats.set(c.id, {
        visits: 0, registrations: 0, trials: 0, checkoutStarts: 0,
        purchases: 0, revenue: 0, weekendPasses: 0, premiumSubs: 0,
        vouchersRedeemed: 0, startMixFree: 0, intentMix30s: 0
      });
    }

    for (const e of events) {
      const utmCamp = e.first_touch_campaign || e.campaign || e.utm_campaign || '';
      const camp = codeToCampaign.get(utmCamp);
      if (!camp) continue;
      const stats = campaignStats.get(camp.id);
      if (!stats) continue;

      if (e.event_type === 'pageview') stats.visits++;
      if (['signup','login','signup_completed'].includes(e.event_type)) stats.registrations++;
      if (e.event_type === 'trial_started') stats.trials++;
      if (e.event_type === 'voucher_redeemed') stats.vouchersRedeemed++;
      if (e.event_type === 'StartMix_Free') stats.startMixFree++;
      if (e.event_type === 'Intent_Mix_30s') stats.intentMix30s++;
    }

    // ── Revenue attribution from orders ─────────────────────
    // Match by plan_code or by user_id cross-reference with analytics
    for (const order of orders) {
      if (order.status !== 'paid') continue;
      let matchedCampaignId: string | null = null;

      const orderCampCode = (order as any).campaign_code || '';
      if (orderCampCode && codeToCampaign.has(orderCampCode)) {
        matchedCampaignId = codeToCampaign.get(orderCampCode).id;
      }

      if (!matchedCampaignId && order.user_id) {
        const userEvents = events.filter(e => e.email === order.email || (e as any).user_id === order.user_id);
        for (const ue of userEvents) {
          const uc = ue.first_touch_campaign || ue.campaign || ue.utm_campaign || '';
          if (uc && codeToCampaign.has(uc)) {
            matchedCampaignId = codeToCampaign.get(uc).id;
            break;
          }
        }
      }

      if (matchedCampaignId) {
        const stats = campaignStats.get(matchedCampaignId);
        if (stats) {
          stats.purchases++;
          stats.revenue += Number(order.amount) || 0;
          if (order.plan_code === 'weekend') stats.weekendPasses++;
          if (order.plan_code === 'premium') stats.premiumSubs++;
        }
      }
    }

    // ── Voucher attribution by source_campaign ──────────────
    const voucherByCampaign = new Map(); // campaign_tag → { total, redeemed, revoked }
    for (const v of vouchers) {
      const tag = v.source_campaign || '';
      if (!tag) continue;
      if (!voucherByCampaign.has(tag)) {
        voucherByCampaign.set(tag, { total: 0, redeemed: 0, revoked: 0, sent: 0 });
      }
      const vc = voucherByCampaign.get(tag);
      vc.total++;
      if (v.status === 'redeemed') vc.redeemed++;
      if (v.status === 'revoked') vc.revoked++;
      if (v.status === 'sent') vc.sent++;
    }

    // ── Strict Financial Live / Test separation ─────────────
    let liveRevenue = 0;
    let testRevenue = 0;
    let unknownRevenue = 0;
    let totalOrdersRevenue = 0;

    let livePurchases = 0;
    let testPurchases = 0;
    let unknownPurchases = 0;
    let totalOrdersCount = 0;

    let liveWeekendPasses = 0;
    let livePremiumSubs = 0;
    let allWeekendPasses = 0;
    let allPremiumSubs = 0;

    for (const o of orders) {
      if (o.status !== 'paid') continue;
      const amt = Number(o.amount) || 0;
      totalOrdersCount++;
      totalOrdersRevenue += amt;
      if (o.plan_code === 'weekend') allWeekendPasses++;
      if (o.plan_code === 'premium') allPremiumSubs++;

      const mode = getOrderPaymentMode(o);
      if (mode === 'live') {
        livePurchases++;
        liveRevenue += amt;
        if (o.plan_code === 'weekend') liveWeekendPasses++;
        if (o.plan_code === 'premium') livePremiumSubs++;
      } else if (mode === 'test') {
        testPurchases++;
        testRevenue += amt;
      } else {
        unknownPurchases++;
        unknownRevenue += amt;
      }
    }

    // ── Global funnel ────────────────────────────────────────
    const funnel = {
      visits: 0,
      registrations: 0,
      trialStarts: 0,
      startMixFree: 0,
      intentMix30s: 0,
      purchases: livePurchases,
      revenue: liveRevenue,
      weekendPasses: liveWeekendPasses,
      premiumSubs: livePremiumSubs,
      liveRevenue,
      testRevenue,
      unknownRevenue,
      allOrdersRevenue: totalOrdersRevenue,
      livePurchases,
      testPurchases,
      unknownPurchases,
      allPurchases: totalOrdersCount,
      allWeekendPasses,
      allPremiumSubs
    };

    const startMixFreeSessions = new Set();
    const intentMix30sSessions = new Set();
    for (const e of events) {
      if (e.event_type === 'pageview') funnel.visits++;
      if (e.event_type === 'signup') funnel.registrations++;
      if (e.event_type === 'trial_started') funnel.trialStarts++;
      if (e.event_type === 'StartMix_Free') {
        const key = e.event_key || e.session_id || e.id;
        startMixFreeSessions.add(key);
      }
      if (e.event_type === 'Intent_Mix_30s') {
        const key = e.event_key || e.session_id || e.id;
        intentMix30sSessions.add(key);
      }
    }
    funnel.startMixFree = startMixFreeSessions.size;
    funnel.intentMix30s = intentMix30sSessions.size;

    // ── Global spend ─────────────────────────────────────────
    const totalSpend = campaigns.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0);
    const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

    // ── Top performers ───────────────────────────────────────
    const campaignRows = campaigns.map(c => {
      const stats = campaignStats.get(c.id) || {};
      const vc = voucherByCampaign.get(c.voucher_campaign_tag || c.internal_code || '') || {};
      const spend = Number(c.actual_spend) || 0;
      const revenue = (stats as any).revenue || 0;
      const visits = (stats as any).visits || 0;
      const registrations = (stats as any).registrations || 0;
      const trials = (stats as any).trials || 0;
      const purchases = (stats as any).purchases || 0;

      return {
        id: c.id,
        name: c.name,
        internal_code: c.internal_code,
        status: c.status,
        objective: c.objective,
        channel: c.channel,
        target_market: c.target_market,
        target_audience: c.target_audience,
        message: c.message,
        budget: Number(c.budget) || 0,
        actual_spend: spend,
        currency: c.currency || 'EUR',
        visits,
        registrations,
        trials,
        startMixFree: (stats as any).startMixFree || 0,
        intentMix30s: (stats as any).intentMix30s || 0,
        purchases,
        revenue,
        weekendPasses: (stats as any).weekendPasses || 0,
        premiumSubs: (stats as any).premiumSubs || 0,
        vouchersRedeemed: (stats as any).vouchersRedeemed || 0,
        voucherStats: vc,
        cpc: visits > 0 && spend > 0 ? spend / visits : null,
        costPerRegistration: registrations > 0 && spend > 0 ? spend / registrations : null,
        costPerTrial: trials > 0 && spend > 0 ? spend / trials : null,
        cac: purchases > 0 && spend > 0 ? spend / purchases : null,
        roas: spend > 0 ? revenue / spend : null,
        conversionRate: visits > 0 ? purchases / visits : null,
        trialToPaidRate: trials > 0 ? purchases / trials : null,
        start_date: c.start_date,
        end_date: c.end_date,
        is_template: c.is_template,
        parent_campaign_id: c.parent_campaign_id,
        variant_label: c.variant_label
      };
    });

    return {
      overview: {
        totalCampaigns: campaigns.filter((c: any) => !c.is_template).length,
        activeCampaigns: campaigns.filter((c: any) => c.status === 'active').length,
        totalSpend,
        totalBudget,
        totalRevenue: funnel.revenue,
        liveRevenue: funnel.liveRevenue,
        testRevenue: funnel.testRevenue,
        unknownRevenue: funnel.unknownRevenue,
        allOrdersRevenue: funnel.allOrdersRevenue,
        totalVisits: funnel.visits,
        totalRegistrations: funnel.registrations,
        totalTrials: funnel.trialStarts,
        totalStartMixFree: funnel.startMixFree,
        totalIntentMix30s: funnel.intentMix30s,
        startMixFreeRate: funnel.visits > 0 ? funnel.startMixFree / funnel.visits : null,
        intentMixFromStartRate: funnel.startMixFree > 0 ? funnel.intentMix30s / funnel.startMixFree : null,
        totalPurchases: funnel.purchases,
        livePurchases: funnel.livePurchases,
        testPurchases: funnel.testPurchases,
        unknownPurchases: funnel.unknownPurchases,
        allPurchases: funnel.allPurchases,
        weekendPasses: funnel.weekendPasses,
        premiumSubs: funnel.premiumSubs,
        allWeekendPasses: funnel.allWeekendPasses,
        allPremiumSubs: funnel.allPremiumSubs,
        trialToPaidRate: funnel.trialStarts > 0 ? funnel.purchases / funnel.trialStarts : null,
        overallCac: funnel.purchases > 0 && totalSpend > 0 ? totalSpend / funnel.purchases : null,
        overallRoas: totalSpend > 0 ? funnel.revenue / totalSpend : null
      },
      funnel:{...funnel,journey:buildMarketingFunnel(events,orders)},
      campaigns: campaignRows,
      links: links.map((l: any) => ({
        id: l.id, campaign_id: l.campaign_id, label: l.label,
        destination_url: l.destination_url, full_url: l.full_url,
        utm_source: l.utm_source, utm_medium: l.utm_medium,
        utm_campaign: l.utm_campaign, utm_content: l.utm_content,
        utm_term: l.utm_term, campaign_code: l.campaign_code, variant: l.variant
      })),
      communitySubmissions: submissions.map((s: any) => ({
        id: s.id, campaign_id: s.campaign_id, week_label: s.week_label,
        participant_alias: s.participant_alias, external_post_url: s.external_post_url,
        track_url: s.track_url, genre: s.genre, platform: s.platform,
        votes: s.votes, is_winner: s.is_winner, voucher_id: s.voucher_id,
        voucher_code: s.voucher_code, notes: s.notes
      })),
      intelligence: intelligence.map((i: any) => ({
        id: i.id, competitor_name: i.competitor_name, product_name: i.product_name,
        url: i.url, country: i.country, price: i.price, currency: i.currency,
        pricing_model: i.pricing_model, usp: i.usp, target_audience: i.target_audience,
        observed_campaign: i.observed_campaign, observed_message: i.observed_message,
        date_checked: i.date_checked, tags: i.tags, notes: i.notes
      })),
      lessons: lessons.map((l: any) => ({
        id: l.id, campaign_id: l.campaign_id, what_worked: l.what_worked,
        what_did_not_work: l.what_did_not_work, best_message: l.best_message,
        best_channel: l.best_channel, best_market: l.best_market,
        unexpected_result: l.unexpected_result, what_to_repeat: l.what_to_repeat,
        what_to_avoid: l.what_to_avoid, next_experiment: l.next_experiment
      })),
      voucherSummary: Object.entries(Object.fromEntries(voucherByCampaign)).map(([tag, v]: [string, any]) => ({
        campaign_tag: tag, ...v
      }))
    };
    };
    const result=aggregate(filter==='all'?allEvents:realEvents,filter==='all'?orders:realOrders);
    return Response.json({...result,traffic:{...trafficMeta(allEvents,filter),excluded_orders:orders.length-realOrders.length,window_limit:null},comparison:filter==='compare'?{all:aggregate(allEvents,orders),real:result}:null});
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}