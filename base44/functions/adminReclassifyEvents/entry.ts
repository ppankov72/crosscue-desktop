import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { trafficContext,classificationFor } from '../../shared/trafficClassifier.ts';
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me();
    if(!user||user.role!=='admin') return Response.json({error:'Forbidden'},{status:403});
    const body=await req.json();
    if(body.cursor&&typeof body.cursor!=='string') return Response.json({error:'Invalid cursor'},{status:400});
    const cutoff=body.cutoff||new Date().toISOString();
    if(!Number.isFinite(Date.parse(cutoff))) return Response.json({error:'Invalid cutoff'},{status:400});
    const context=await trafficContext(base44);
    const offset=body.cursor?Number(body.cursor):0;
    if(!Number.isSafeInteger(offset)||offset<0||offset>100000000) return Response.json({error:'Invalid cursor'},{status:400});
    const items=await base44.asServiceRole.entities.AnalyticsEvent.filter({created_date:{$lte:cutoff}},'-created_date',250,offset);
    const counts={real:0,internal:0,test:0,bot:0};
    const updates=items.map(e=>{const c=classificationFor(e,context,true); counts[c.traffic_class]++; return {id:e.id,...c,identity_internal:Boolean(e.identity_internal||context.identities.has(e.installation_id)),classified_at:new Date().toISOString()};});
    if(updates.length) await base44.asServiceRole.entities.AnalyticsEvent.bulkUpdate(updates);
    return Response.json({processed:updates.length,counts,cutoff,cursor:items.length===250?String(offset+items.length):null,has_more:items.length===250});
  } catch(error){ return Response.json({error:error.message},{status:500}); }
}