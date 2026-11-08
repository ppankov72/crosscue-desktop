import { botDefaults,matchesAutomation } from './botRules.ts';
// Deterministic classification; authentication evidence is supplied by the server.
export const systemRules = [
  {rule_type:'role',value:'admin',traffic_class:'internal',enabled:true,is_system:true,notes:'Exclude owner/admin activity from marketing analytics'},
  {rule_type:'role',value:'owner',traffic_class:'internal',enabled:true,is_system:true,notes:'Exclude owner activity'},
  {rule_type:'role',value:'super_admin',traffic_class:'internal',enabled:true,is_system:true,notes:'Exclude super-admin activity'},
  {rule_type:'environment',value:'preview',traffic_class:'test',enabled:true,is_system:true,notes:'Base44 preview sessions'},
  {rule_type:'environment',value:'editor',traffic_class:'test',enabled:true,is_system:true,notes:'Base44 editor sessions'},
  {rule_type:'environment',value:'development',traffic_class:'internal',enabled:true,is_system:true,notes:'Development sessions'},
  {rule_type:'environment',value:'localhost',traffic_class:'test',enabled:true,is_system:true,notes:'Local browser tests'},
  {rule_type:'environment',value:'stripe_test',traffic_class:'test',enabled:true,is_system:true,notes:'Explicit Stripe test-mode evidence'},
  {rule_type:'domain',value:'app.base44.com',traffic_class:'internal',enabled:true,is_system:true,notes:'Base44 builder referrer'},
  {rule_type:'domain',value:'dashboard.stripe.com',traffic_class:'test',enabled:true,is_system:true,notes:'Stripe dashboard referrer (not normal Checkout)'}
];
export const isInternalUser = user => Boolean(user && (['admin','owner','super_admin'].includes(user.role) || ['owner','super_admin','admin'].includes(user.custom_role)));
export function hostOf(value) { try { return new URL(value.includes('://')?value:'https://'+value).hostname.toLowerCase(); } catch { return ''; } }
export function detectEnvironment(origin='',referrer='',hint='') {
  const hosts=[hostOf(origin),hostOf(referrer)];
  if(hosts.some(h=>h==='localhost'||h==='127.0.0.1'||h==='[::1]')) return 'localhost';
  if(hosts.some(h=>/^preview(-sandbox)?--/.test(h)&&h.endsWith('.base44.app'))) return 'preview';
  if(hostOf(referrer)==='app.base44.com') return 'editor';
  return ['preview','editor','development','localhost','stripe_test'].includes(hint)?hint:'production';
}
export function classifyEvent(user,ip,referrer,origin,utm,rules,context={}) {
  // Owner/admin is mandatory and wins over test rules. UTM never overrides identity.
  if(isInternalUser(user)||context.identity_internal) return {traffic_class:'internal',classification_reason:context.identity_internal?'verified owner/admin browser':'verified owner/admin user'};
  const environment=detectEnvironment(origin,referrer,context.environment);
  const hosts=[hostOf(origin),hostOf(referrer)].filter(Boolean);
  let match=null;
  for(const rule of [...systemRules,...rules]) {
    if(!rule.enabled) continue;
    const v=String(rule.value||'').trim().toLowerCase(); let yes=false;
    if(rule.rule_type==='user_id') yes=Boolean(user?.id)&&user.id===rule.value;
    if(rule.rule_type==='role') yes=[user?.role,user?.custom_role].filter(Boolean).some(r=>r.toLowerCase()===v);
    if(rule.rule_type==='ip') yes=Boolean(ip)&&ip.toLowerCase()===v;
    if(rule.rule_type==='environment') yes=environment===v;
    if(rule.rule_type==='utm_source') yes=Boolean(utm?.source)&&utm.source.toLowerCase()===v;
    if(rule.rule_type==='domain') { const domain=hostOf(v); yes=Boolean(domain)&&hosts.some(h=>h===domain||h.endsWith('.'+domain)); }
    yes=yes||matchesAutomation(rule,context);
    const rank={real:1,bot:2,internal:3,test:4};
    if(yes && (!match || rank[rule.traffic_class]>=rank[match.traffic_class])) match=rule;
    if(yes&&rule.traffic_class==='real'&&!rule.is_system&&!rule.seed_key&&!match?.is_system) return {traffic_class:'real',classification_reason:`Admin allow rule: ${rule.rule_type}: ${rule.value}`};
  }
  return match?{traffic_class:match.traffic_class,classification_reason:`${match.rule_type}: ${match.value}`}:{traffic_class:'real',classification_reason:'No internal/test evidence'};
}
let ruleCache=null;
export async function* entityPages(entity,query={}) {
  // The deployed runtime uses the positional pagination contract; User has no v2 cursor endpoint.
  let offset=0;
  while(true) {
    const items=Object.keys(query).length?await entity.filter(query,'-created_date',500,offset):await entity.list('-created_date',500,offset);
    yield items;
    if(items.length<500)break;
    offset+=items.length;
  }
}
export async function loadRules(base44,cached=false) {
  if(cached&&ruleCache&&Date.now()-ruleCache.at<5000) return ruleCache.items;
  const items=[]; for await(const page of entityPages(base44.asServiceRole.entities.InternalTrafficRule)) items.push(...page);
  const missing=botDefaults.filter(r=>!items.some(e=>e.seed_key===r.seed_key));
  if(missing.length)items.push(...await base44.asServiceRole.entities.InternalTrafficRule.bulkCreate(missing));
  ruleCache={at:Date.now(),items}; return items;
}
export function invalidateRules(){ruleCache=null;}
export async function trafficContext(base44) {
  const users=[]; for await(const page of entityPages(base44.asServiceRole.entities.User)) users.push(...page);
  const byId=new Map(users.map(u=>[u.id,u])), byEmail=new Map(users.filter(u=>u.email).map(u=>[u.email.toLowerCase(),u]));
  const identities=new Set();
  // Historical email joins are only used against server-stored event email.
  const rules=await loadRules(base44);
  const protectedIds=new Set(rules.filter(r=>r.is_system&&r.rule_type==='user_id').map(r=>r.value));
  const elevated=users.filter(u=>isInternalUser(u)||protectedIds.has(u.id));
  const evidence={$or:[{identity_internal:true},{user_role:{$in:['admin','owner','super_admin']}},{user_custom_role:{$in:['admin','owner','super_admin']}},{user_id:{$in:[...new Set([...protectedIds,...elevated.map(u=>u.id)])]}},{email:{$in:elevated.map(u=>u.email).filter(Boolean)}}]};
  for await(const page of entityPages(base44.asServiceRole.entities.AnalyticsEvent,evidence)) {
    for(const e of page) if(e.identity_internal||protectedIds.has(e.user_id)||elevated.some(u=>u.email&&u.email.toLowerCase()===(e.email||'').toLowerCase())||isInternalUser(byId.get(e.user_id)||byEmail.get((e.email||'').toLowerCase()))||isInternalUser({role:e.user_role,custom_role:e.user_custom_role})) {
      if(e.installation_id&&e.installation_id!=='unknown') identities.add(e.installation_id);
    }
  }
  const orderModes=new Map();
  for await(const page of entityPages(base44.asServiceRole.entities.PaymentEvent,{signature_valid:true})) {
    for(const p of page) { try { const raw=JSON.parse(p.raw_payload||'{}'); if(p.order_id&&typeof raw.livemode==='boolean') orderModes.set(p.order_id,raw.livemode?'production':'stripe_test'); } catch { /* Truncated historical payload: no reliable mode evidence. */ } }
  }
  return {byId,byEmail,identities,orderModes,rules,protectedIds};
}
export function classificationFor(e,context,reclassify=false) {
  const currentUser=context.byId.get(e.user_id)||context.byEmail.get((e.email||'').toLowerCase());
  const user={id:e.user_id||currentUser?.id,role:e.user_role||currentUser?.role,custom_role:e.user_custom_role||currentUser?.custom_role};
  const identity=e.identity_internal||context.identities.has(e.installation_id)||context.protectedIds?.has(user.id);
  let custom={}; try {custom=JSON.parse(e.custom_data||'{}');} catch {}
  const environment=context.orderModes?.get(custom.order_id)||e.environment;
  const result=classifyEvent(user,e.ip,e.referrer,e.origin,{source:e.utm_source},context.rules,{...e,environment,identity_internal:identity});
  if(reclassify||!e.classified_at||identity||isInternalUser(user)) return result;
  return {traffic_class:e.traffic_class||'real',classification_reason:e.classification_reason||''};
}
export function trafficMeta(events,filter) {
  const counts={real:0,internal:0,test:0,bot:0}; for(const e of events) counts[e.traffic_class||'real']++;
  return {filter,counts,hidden_events:filter==='all'?0:counts.internal+counts.test+counts.bot,total_events:events.length};
}