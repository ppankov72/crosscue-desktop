import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { recordMarketingEvent, observeTrial, attribution } from '../../shared/marketingEvents.ts';
import { classifyEvent } from '../../shared/trafficClassifier.ts';
export default async function(req) {
  try {
    const client=createClientFromRequest(req),user=await client.auth.me();
    if(user?.role!=='admin')return Response.json({error:'Forbidden'},{status:403});
    const records=[];
    const entity={filter:async(query,sort,limit)=>records.filter(r=>Object.entries(query).every(([k,v])=>r[k]===v)).sort((a,b)=>sort==='created_date'?a.created_date.localeCompare(b.created_date):b.created_date.localeCompare(a.created_date)).slice(0,limit),create:async(data)=>{if('livemode' in data)throw new Error('Unexpected livemode entity field');const record={...data,id:String(records.length+1),created_date:new Date().toISOString()};records.push(record);return record;},delete:async(id)=>{const i=records.findIndex(r=>r.id===id);if(i>=0)records.splice(i,1);}};
    const fake={asServiceRole:{entities:{AnalyticsEvent:entity,InternalTrafficRule:{list:async()=>[],bulkCreate:async(items)=>items}}}};
    const context={installation_id:'regression-fixture',browser_token:'regression-browser-token-'.repeat(3),first_touch:{source:'test_source',medium:'test_medium',campaign:'test_campaign',referrer:'https://example.org/',landing_page:'/'}};
    for(const type of ['weekend_checkout_started','premium_checkout_started','payment_succeeded'])await recordMarketingEvent(fake,{type,context,key:type,extra:{order_id:type,livemode:false}});
    const trial={id:'regression-trial',installation_id:context.installation_id,playback_used_seconds:2400,trial_limit_seconds:2400,status:'expired'};
    await Promise.all(Array.from({length:12},()=>observeTrial(fake,trial,{playing:true})));
    const milestones=['trial_playback_started','trial_playback_10min','trial_playback_25min','trial_exhausted'];
    const direct=attribution({first_touch:context.first_touch,utm:{},referrer:''});
    return Response.json({scope:'Isolated helper regression; no production records or payments created',checkout:records.filter(r=>r.event_type.endsWith('checkout_started')).length===2,payment:records.some(r=>r.event_type==='payment_succeeded'),duplicateProtection:milestones.every(type=>records.filter(r=>r.event_type===type).length===1),firstTouch:records.filter(r=>r.order_id).every(r=>r.first_touch_campaign==='test_campaign'&&r.first_touch_referrer==='https://example.org/')&&direct.first_touch_source==='test_source',payload:records.filter(r=>r.order_id).every(r=>JSON.parse(r.custom_data).livemode===false&&!('livemode' in r)),internal:classifyEvent({role:'admin'},'','','',{},[],{}).traffic_class==='internal',testIsolation:classifyEvent(null,'','','',{},[],{environment:'stripe_test'}).traffic_class==='test',browserHash:records.filter(r=>r.order_id).every(r=>r.browser_identity_hash.length===64)});
  } catch(error) {return Response.json({error:error.message},{status:500});}
}