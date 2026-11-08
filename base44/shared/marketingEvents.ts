import { classifyTrafficSource } from './analytics.ts';
import { classifyEvent,loadRules,isInternalUser } from './trafficClassifier.ts';
export const funnelEvents=['landing_view','launch_clicked','signup_completed','trial_started','trial_playback_started','trial_playback_10min','trial_playback_25min','trial_exhausted','weekend_checkout_started','premium_checkout_started','payment_succeeded'];
export function attribution(data={}){
  const touch=data.first_touch||{}; const current=classifyTrafficSource(data.referrer||'',data.utm||{}),first=classifyTrafficSource(touch.referrer||data.referrer||'',touch.source!==undefined?touch:data.utm||{});
  return {anonymous_id:data.installation_id||'unknown',landing_page:String(touch.landing_page||data.landing_page||data.page||'/').slice(0,500),source:current.utmSource||current.detail||current.source,medium:current.utmMedium||current.source,campaign:current.utmCampaign||'',first_touch_source:first.utmSource||first.detail||first.source,first_touch_medium:first.utmMedium||first.source,first_touch_campaign:first.utmCampaign||'',first_touch_referrer:String(touch.referrer||data.referrer||'').slice(0,1000)};
}
export async function browserHash(token){if(typeof token!=='string'||token.length<40||token.length>150)return '';const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');}
const pendingEvents = new Map();
export async function recordMarketingEvent(base44,options){
  const key=options.key||'';
  if(key&&pendingEvents.has(key))return pendingEvents.get(key);
  const pending=writeMarketingEvent(base44,options);
  if(key)pendingEvents.set(key,pending);
  try{return await pending;}finally{if(key&&pendingEvents.get(key)===pending)pendingEvents.delete(key);}
}
async function writeMarketingEvent(base44,{type,user=null,installationId='',context={},key='',extra={}}){
  try{
    const {livemode,...extraFields}=extra;
    installationId=installationId||context.installation_id||'';
    const entity=base44.asServiceRole.entities.AnalyticsEvent;
    if(key&&(await entity.filter({event_key:key},'-created_date',1)).length)return;
    const query=installationId?{installation_id:installationId}:user?.id?{user_id:user.id}:null;
    const orderHistory=extra.order_id?await entity.filter({order_id:extra.order_id},'-created_date',1):[];
    const history=orderHistory.length?orderHistory:query?await entity.filter(query,'-created_date',1):[];
    const prior=history[0]||{};const id=installationId||prior.installation_id||'unknown';
    const rules=await loadRules(base44,true),classification=classifyEvent(user,prior.ip||'',prior.referrer||context.referrer||'',prior.origin||context.origin||'',context.utm||{source:prior.utm_source},rules,{...prior,environment:livemode===false?'stripe_test':prior.environment||context.environment,identity_internal:prior.identity_internal||isInternalUser(user)});
    const now=new Date().toISOString(),attrs=attribution({...context,installation_id:id});
    for(const field of ['source','medium','campaign','landing_page','first_touch_source','first_touch_medium','first_touch_campaign','first_touch_referrer'])if(prior[field]!==undefined)attrs[field]=prior[field];
    const created=await entity.create({...attrs,...classification,event_type:type,event_key:key,installation_id:id,anonymous_id:id,session_id:prior.session_id||context.session_id||'unknown',timestamp:now,classified_at:now,user_id:user?.id||prior.user_id||'',user_role:user?.role||prior.user_role||'',user_custom_role:user?.custom_role||prior.user_custom_role||'',identity_internal:classification.traffic_class==='internal'&&(prior.identity_internal||isInternalUser(user)),is_authenticated:!!user,is_trial_user:type.startsWith('trial_'),page:prior.page||context.page||'',referrer:prior.referrer||context.referrer||'',origin:prior.origin||context.origin||'',environment:livemode===false?'stripe_test':prior.environment||context.environment||'production',utm_source:prior.utm_source||context.utm?.source||'',utm_medium:prior.utm_medium||context.utm?.medium||'',utm_campaign:prior.utm_campaign||context.utm?.campaign||'',device:prior.device||'',browser:prior.browser||'',country:prior.country||'',ip:prior.ip||'',user_agent:prior.user_agent||'',webdriver:prior.webdriver===true,browser_identity_hash:prior.browser_identity_hash||await browserHash(context.browser_token),...extraFields,custom_data:JSON.stringify(extra)});
    if(key){
      const matches=await entity.filter({event_key:key},'created_date',500);
      matches.sort((a,b)=>String(a.created_date).localeCompare(String(b.created_date))||String(a.id).localeCompare(String(b.id)));
      // Each writer removes only its own losing record; existing records are never deleted.
      if(matches.length>1&&matches[0].id!==created.id)await entity.delete(created.id);
    }
  }catch(error){console.warn('[marketing analytics]',type,error.message);}
}
export async function observeTrial(base44,trial,{user=null,playing=false}={}){
  const used=Number(trial.playback_used_seconds||0),extra={trial_id:trial.id};
  await recordMarketingEvent(base44,{type:'trial_started',user,installationId:trial.installation_id,key:`trial_started:${trial.id}`,extra});
  const milestones=[['trial_playback_started',playing||used>0],['trial_playback_10min',used>=600],['trial_playback_25min',used>=1500],['trial_exhausted',trial.status==='expired'&&used>=Number(trial.trial_limit_seconds||2400)]];
  for(const [type,yes]of milestones)if(yes)await recordMarketingEvent(base44,{type,user,installationId:trial.installation_id,key:`${type}:${trial.id}`,extra});
}