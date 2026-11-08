import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseUA, getClientIp, getGeoFromIp } from '../../shared/trialSystem.ts';
import { classifyTrafficSource } from '../../shared/analytics.ts';
import { classifyEvent,loadRules,detectEnvironment,isInternalUser } from '../../shared/trafficClassifier.ts';
import { attribution,browserHash,recordMarketingEvent,funnelEvents } from '../../shared/marketingEvents.ts';
import { waitUntil } from 'base44:runtime';

// Logs an analytics event (pageview, session_start, playback, trial, custom, etc.)
// with traffic source attribution and geo/device info.
//
// Body:
//   event_type: string (required)
//   page: string (current path)
//   referrer: string (document.referrer)
//   installation_id: string (persistent visitor ID)
//   session_id: string (per-tab session ID)
//   utm: { source, medium, campaign }
//   custom_data: object (event-specific properties)
//   is_trial_user: boolean

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch {}

    const eventType = body.event_type || 'custom';
    const serverOnly=['payment_succeeded','weekend_checkout_started','premium_checkout_started','trial_playback_started','trial_playback_10min','trial_playback_25min','trial_exhausted'];
    if(serverOnly.includes(eventType))return Response.json({error:'This event is recorded by the authoritative server flow'},{status:403});
    if(![...funnelEvents,'pageview','session_start','playback_start','playback_stop','StartMix_Free','Intent_Mix_30s','trial_expired','trial_feedback','voucher_redeemed','signup','login','logout','custom'].includes(eventType))return Response.json({error:'Unknown event type'},{status:400});

    // GDPR Consent Enforcement (Fail-Closed for optional categories):
    // Necessary functional telemetry (trial enforcement, authentication, voucher redemption) is always allowed.
    // Marketing and Analytics events require explicit boolean === true consent; missing, malformed, or false consent is rejected.
    const necessaryFunctionalEvents = [
      'trial_started',
      'trial_expired',
      'trial_feedback',
      'voucher_redeemed',
      'signup',
      'login',
      'logout',
      'signup_completed'
    ];
    const marketingEvents = ['landing_view', 'launch_clicked'];
    const analyticsEvents = ['pageview', 'session_start', 'playback_start', 'playback_stop', 'StartMix_Free', 'Intent_Mix_30s', 'custom'];
    const consent = body.consent && typeof body.consent === 'object' ? body.consent : null;

    if (!necessaryFunctionalEvents.includes(eventType)) {
      if (marketingEvents.includes(eventType)) {
        if (!consent || consent.marketing !== true) {
          return Response.json({ ok: true, skipped: 'marketing_consent_denied' });
        }
      } else if (analyticsEvents.includes(eventType) || !necessaryFunctionalEvents.includes(eventType)) {
        if (!consent || consent.analytics !== true) {
          return Response.json({ ok: true, skipped: 'analytics_consent_denied' });
        }
      }
    }
    const page = body.page || '/';
    const installationId = body.installation_id || 'unknown';
    const sessionId = body.session_id || 'unknown';

    // Auth state
    let email = '';
    let isAuthenticated = false;
    let authenticatedUser = null;
    try {
      const user = await base44.auth.me();
      authenticatedUser = user;
      if (user?.email) {
        email = user.email;
        isAuthenticated = true;
      }
    } catch {}

    // Device/geo
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { device, os, browser } = parseUA(userAgent);
    const ip = getClientIp(req.headers);
    const geo = await getGeoFromIp(ip);

    // Traffic source
    const referrer = body.referrer || '';
    const utm = body.utm || {};
    const traffic = classifyTrafficSource(referrer, utm);

    // Custom data as JSON string
    const customData = body.custom_data ? JSON.stringify(body.custom_data) : '';

    const rules = await loadRules(base44,true);
    const origin = String(body.origin || req.headers.get('origin') || '').slice(0,500);
    const environment = detectEnvironment(origin,referrer,body.custom_data?.livemode===false?'stripe_test':body.environment);
    let identityInternal = isInternalUser(authenticatedUser)||Boolean(authenticatedUser?.id&&rules.some(r=>r.is_system&&r.rule_type==='user_id'&&r.value===authenticatedUser.id));
    if(!identityInternal && installationId!=='unknown') {
      const evidence=await base44.asServiceRole.entities.AnalyticsEvent.filter({installation_id:installationId,identity_internal:true},'-created_date',1);
      identityInternal=evidence.length>0;
    }
    if(eventType==='signup_completed'&&!authenticatedUser)return Response.json({error:'Authentication required'},{status:401});
    const entity=base44.asServiceRole.entities.AnalyticsEvent;
    const hash=await browserHash(body.browser_token);
    const history=hash?await entity.filter({installation_id:installationId,browser_identity_hash:hash},'created_date',1):[];
    const attrs=attribution({...body,installation_id:installationId});
    for(const field of ['first_touch_source','first_touch_medium','first_touch_campaign','first_touch_referrer','landing_page'])if(history[0]?.[field]!==undefined)attrs[field]=history[0][field];
    const recent=await entity.filter({...hash?{browser_identity_hash:hash}:installationId!=='unknown'?{installation_id:installationId}:{ip},created_date:{$gte:new Date(Date.now()-60000).toISOString()}},'-created_date',500);
    const signals={user_agent:userAgent.slice(0,1500),webdriver:body.webdriver===true,request_count_60s:recent.length+1,anonymous_id:installationId};
    const classification=classifyEvent(authenticatedUser,ip,referrer,origin,utm,rules,{...signals,environment,identity_internal:identityInternal});
    const sessionScopedEvents = ['StartMix_Free', 'Intent_Mix_30s'];
    const computedEventKey = eventType === 'signup_completed'
      ? `signup_completed:${authenticatedUser.id}`
      : sessionScopedEvents.includes(eventType) && sessionId !== 'unknown'
        ? `${eventType}:${sessionId}`
        : '';
    const duplicateSignup = eventType === 'signup_completed' && (await entity.filter({ event_type: 'signup_completed', user_id: authenticatedUser.id }, '-created_date', 1)).length > 0;
    const duplicateSessionEvent = sessionScopedEvents.includes(eventType) && (
      computedEventKey
        ? (await entity.filter({ event_key: computedEventKey }, '-created_date', 1)).length > 0
        : (await entity.filter({ event_type: eventType, session_id: sessionId, installation_id: installationId }, '-created_date', 1)).length > 0
    );
    if (duplicateSessionEvent) {
      return Response.json({ ok: true, deduplicated: true, event_key: computedEventKey });
    }
    if(!duplicateSignup)await entity.create({
      ...attrs,...signals,browser_identity_hash:hash,timestamp:new Date().toISOString(),
      event_key:computedEventKey,
      ...classification,
      classified_at:new Date().toISOString(),
      identity_internal:identityInternal,
      user_id:authenticatedUser?.id||'',
      user_role:authenticatedUser?.role||'',
      user_custom_role:authenticatedUser?.custom_role||'',
      origin,environment,
      installation_id: installationId,
      session_id: sessionId,
      event_type: eventType,
      page,
      referrer,
      traffic_source: traffic.source,
      traffic_source_detail: traffic.detail,
      utm_source: traffic.utmSource,
      utm_medium: traffic.utmMedium,
      utm_campaign: traffic.utmCampaign,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      device,
      os,
      browser,
      is_trial_user: Boolean(body.is_trial_user),
      is_authenticated: isAuthenticated,
      email,
      ip,
      custom_data: customData
    });

    if(authenticatedUser&&hash)waitUntil((async()=>{
      const query={installation_id:installationId,browser_identity_hash:hash,$or:[{user_id:''},{user_id:{$exists:false}}]};
      for(let batch=0;batch<40;batch++){
        const anonymous=await entity.filter(query,'-created_date',250);if(!anonymous.length)break;
        await entity.bulkUpdate(anonymous.map(e=>({id:e.id,user_id:authenticatedUser.id})));
      }
      if(eventType!=='signup_completed'&&Date.now()-Date.parse(authenticatedUser.created_date)<3600000)await recordMarketingEvent(base44,{type:'signup_completed',user:authenticatedUser,installationId,key:`signup_completed:${authenticatedUser.id}`,context:body});
    })().catch(error=>console.warn('[analytics identity link]',error.message)));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}