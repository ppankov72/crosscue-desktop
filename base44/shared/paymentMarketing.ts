import { recordMarketingEvent } from './marketingEvents.ts';
export async function recordVerifiedPayment(base44,event){
  try{
    if(event.status!=='succeeded'||!event.orderId)return;
    const order=await base44.asServiceRole.entities.Order.get(event.orderId);
    if(order?.status!=='paid')return;
    let user={id:order.user_id,email:order.email};
    try{user=await base44.asServiceRole.entities.User.get(order.user_id);}catch{}
    const raw=event.rawEvent?.data?.object;
    const checkout=(await base44.asServiceRole.entities.AnalyticsEvent.filter({order_id:order.id},'-created_date',1))[0];
    const sessionId=raw?.object==='checkout.session'?raw.id:checkout?.stripe_session_id||'';
    await recordMarketingEvent(base44,{type:'payment_succeeded',user,key:`payment_succeeded:${order.id}`,extra:{order_id:order.id,plan:order.plan_code,amount:event.amount||order.amount,currency:order.currency,stripe_session_id:sessionId,livemode:event.rawEvent?.livemode}});
  }catch(error){console.warn('[payment marketing]',error.message);}
}