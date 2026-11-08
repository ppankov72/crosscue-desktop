import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { loadRules,systemRules,invalidateRules,hostOf,entityPages,isInternalUser } from '../../shared/trafficClassifier.ts';
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me();
    if(!user||user.role!=='admin') return Response.json({error:'Forbidden'},{status:403});
    const body=await req.json(); const action=body.action||'list';
    const entity=base44.asServiceRole.entities.InternalTrafficRule;
    if(action==='list') {
      const existing=await loadRules(base44);
      const defaults=[...systemRules];
      for await(const users of entityPages(base44.asServiceRole.entities.User)) for(const u of users) if(isInternalUser(u)) defaults.push({rule_type:'user_id',value:u.id,traffic_class:'internal',enabled:true,is_system:true,notes:'Verified owner/admin user ID'});
      const missing=defaults.filter(r=>!existing.some(e=>e.is_system&&e.rule_type===r.rule_type&&e.value===r.value));
      if(missing.length) await entity.bulkCreate(missing);
      invalidateRules(); return Response.json({rules:await loadRules(base44)});
    }
    if(!['save','delete'].includes(action)) return Response.json({error:'Invalid action'},{status:400});
    if(body.id) { const old=await entity.get(body.id); if(old.is_system) return Response.json({error:'System rules are locked'},{status:403}); if(action==='delete'&&old.seed_key)return Response.json({error:'Disable default detection rules instead of deleting them'},{status:400}); }
    if(action==='delete') { if(!body.id) return Response.json({error:'Rule ID required'},{status:400}); await entity.delete(body.id); }
    else {
      const r=body.rule||{}; const value=String(r.value||'').trim();
      if(!['user_id','role','ip','domain','environment','utm_source','user_agent','browser_identity','automated_pattern'].includes(r.rule_type)||!['real','internal','test','bot'].includes(r.traffic_class)||!value||value.length>255) return Response.json({error:'Select a valid rule type, classification and value'},{status:400});
      if(r.rule_type==='domain'&&!hostOf(value)) return Response.json({error:'Enter a valid hostname or referrer URL'},{status:400});
      if(r.rule_type==='automated_pattern'&&value!=='webdriver'&&!/^frequency:([1-9]\d{0,4})$/.test(value))return Response.json({error:'Use webdriver or frequency:N (requests in 60 seconds)'},{status:400});
      const data={rule_type:r.rule_type,value,traffic_class:r.traffic_class,enabled:r.enabled!==false,notes:String(r.notes||'').slice(0,1000),is_system:false};
      if(body.id) await entity.update(body.id,data); else await entity.create(data);
    }
    invalidateRules(); return Response.json({rules:await loadRules(base44)});
  } catch(error) { return Response.json({error:error.message},{status:500}); }
}