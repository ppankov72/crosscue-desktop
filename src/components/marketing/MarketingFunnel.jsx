import { formatNumber,formatPercent } from '@/lib/marketing/constants';
export default function MarketingFunnel({data}){
  const funnel=data.funnel?.journey,all=data.comparison?.all?.funnel?.journey;
  if(!funnel)return null;
  return <section className="rounded-xl border border-border bg-card p-5 text-card-foreground">
    <h2 className="mb-4 text-sm font-bold uppercase tracking-wide">Marketing Funnel · {data.traffic?.filter==='all'?'All traffic':'Real traffic'}</h2>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Stage','Visitors','Conversion from previous',...(all?['All visitors','All conversion']:[])].map(label=><th key={label} className="border-b border-border p-2">{label}</th>)}</tr></thead><tbody>{funnel.stages.map((stage,i)=><tr key={stage.key}><td className="border-b border-border p-2 font-medium">{stage.key === 'payment_succeeded' ? 'Paid (Unique Customers)' : stage.label}</td><td className="p-2 tabular-nums">{formatNumber(stage.visitors)}</td><td className="p-2 tabular-nums">{i?formatPercent(stage.conversion_rate):'—'}</td>{all&&<><td className="p-2 tabular-nums">{formatNumber(all.stages[i].visitors)}</td><td className="p-2 tabular-nums">{i?formatPercent(all.stages[i].conversion_rate):'—'}</td></>}</tr>)}</tbody></table></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p>Checkout: Weekend Pass {formatNumber(funnel.checkout.weekend)} · Premium {formatNumber(funnel.checkout.premium)}{all&&` | All: Weekend Pass ${formatNumber(all.checkout.weekend)} · Premium ${formatNumber(all.checkout.premium)}`}</p>
      {funnel.paid_orders !== undefined && (
        <p className="text-xs font-semibold text-emerald-400">
          Paid Stage: {formatNumber(funnel.unique_customers)} Unique Paying Customers · {formatNumber(funnel.paid_orders)} Paid Orders
        </p>
      )}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Trial Engaged = at least 10 minutes of server-accounted playback. {funnel.definition}</p>
  </section>;
}