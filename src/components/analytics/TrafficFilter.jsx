export default function TrafficFilter({mode,onChange,traffic}) {
  return <section className="rounded-xl border border-border bg-card p-4 text-card-foreground">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold">Traffic classification</h2><label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={mode!=='all'} onChange={e=>onChange(e.target.checked?'real':'all')}/>Exclude internal/test/bot traffic</label></div>
      <div role="group" aria-label="Traffic comparison" className="flex rounded-lg border border-border p-1">{[['all','All traffic'],['real','Real traffic'],['compare','Compare']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>onChange(value)} className={mode===value?'rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground':'rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted'}>{label}</button>)}</div>
    </div>
    <p role="status" className={mode==='all'?'mt-3 text-sm font-medium text-muted-foreground':'mt-3 text-sm font-medium text-success'}>{mode==='all'?'Showing all traffic':`Internal / Test / Bot traffic excluded (${traffic?.hidden_events||0} events hidden)${mode==='compare'?' · All vs Real comparison':''}`}</p>
    {traffic&&<p className="mt-1 text-xs text-muted-foreground">Real: {traffic.counts.real} · Internal: {traffic.counts.internal} · Test: {traffic.counts.test} · Bot: {traffic.counts.bot||0} · {traffic.total_events} recorded events in this report. Data is retained.</p>}
  </section>;
}