import { useEffect,useState } from 'react';
import { base44 } from '@/api/base44Client';
import TrafficRuleForm from '@/components/marketing/TrafficRuleForm';
import { META_PIXEL_ID, isMetaBrowserOptedOut, setMetaBrowserOptOut } from '@/lib/marketing/metaPixel';
export default function InternalTrafficRules({onDataChange}) {
  const [rules,setRules]=useState(null),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
  const [metaOptOut, setMetaOptOut] = useState(() => isMetaBrowserOptedOut());
  const toggleMetaOptOut = () => {
    const next = !metaOptOut;
    setMetaBrowserOptOut(next);
    setMetaOptOut(next);
  };
  const request=async payload=>{const res=await base44.functions.invoke('adminInternalTrafficRules',payload);setRules(res.data.rules);};
  useEffect(()=>{request({action:'list'}).catch(e=>setError(e.message));},[]);
  const mutate=async payload=>{setBusy(true);setError('');try {await request(payload);setEditing(null);setStatus('Rules saved. Reclassify existing events to update history.');onDataChange();}catch(e){setError(e.response?.data?.error||e.message);}finally{setBusy(false);}};
  const reclassify=async()=>{
    if(!window.confirm('Reclassify all existing events using the current rules? No events will be deleted.'))return;
    setBusy(true);setError('');let cursor=null,cutoff=null,total=0;
    try {do{const {data}=await base44.functions.invoke('adminReclassifyEvents',{cursor,cutoff});total+=data.processed;cutoff=data.cutoff;cursor=data.has_more?data.cursor:null;setStatus(`Reclassified ${total} events…`);}while(cursor);setStatus(`Completed: ${total} events reclassified. No events deleted.`);onDataChange();}catch(e){setError(`Reclassification stopped after ${total} events. You can run it again. ${e.response?.data?.error||e.message}`);}finally{setBusy(false);}
  };
  return <section className="space-y-4 text-card-foreground"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Internal/Bot Traffic Rules</h2><div className="flex gap-2"><button disabled={busy} onClick={()=>setEditing({})} className="rounded bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Add rule</button><button disabled={busy||!rules} onClick={reclassify} className="rounded border border-border bg-card px-3 py-2 text-sm">{busy?'Working…':'Reclassify existing events'}</button></div></div>
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-stone-900">Meta Pixel ({META_PIXEL_ID}) — Browser Isolation & Test Events</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Preview/sandbox, localhost, and webdriver sessions are automatically blocked from sending live hits to Meta. To test in Meta Events Manager → Test Events, open the site with <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs">?meta_pixel_test=1</code> and accept Marketing cookies.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMetaOptOut}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${metaOptOut ? 'bg-amber-600 text-white' : 'border border-stone-300 bg-stone-50 text-stone-800 hover:bg-stone-100'}`}
        >
          {metaOptOut ? 'This Browser Excluded from Meta Pixel (Active)' : 'Exclude This Browser from Live Meta Pixel'}
        </button>
      </div>
    </div>
    <p className="text-sm">Owner/admin activity is always excluded from Real traffic, including campaign tests. Verified owner/admin browsers remain internal after logout. Clearing browser storage or using another anonymous browser removes that identification; use an IP rule if needed.</p>
    <p className="text-xs text-muted-foreground">Historical events can only be identified from evidence that was recorded. Stripe test payments use signed webhook mode evidence; unavailable or truncated historical evidence cannot reliably be reconstructed.</p>
    {error&&<p role="alert" className="text-destructive">{error}</p>}{status&&<p role="status" className="text-sm">{status}</p>}
    {editing&&<TrafficRuleForm key={editing.id||'new'} rule={editing.id?editing:null} busy={busy} onSave={rule=>mutate({action:'save',id:editing.id,rule})} onCancel={()=>setEditing(null)}/>}
    {!rules?<p>{error?'Rules could not be loaded.':'Loading rules…'}</p>:<div className="overflow-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead><tr>{['Type','Value','Class','Enabled','Notes','Actions'].map(t=><th key={t} className="border-b border-border p-3">{t}</th>)}</tr></thead><tbody>{rules.map(r=><tr key={r.id}><td className="p-3">{r.rule_type}</td><td className="p-3 break-all">{r.value}</td><td className="p-3">{r.traffic_class}</td><td className="p-3">{r.enabled?'Yes':'No'}</td><td className="p-3">{r.notes}</td><td className="p-3">{r.is_system?'Locked system rule':<div className="flex gap-2"><button disabled={busy} onClick={()=>setEditing(r)} className="underline">Edit</button>{!r.seed_key&&<button disabled={busy} onClick={()=>{if(window.confirm('Delete this rule? Events are retained.'))mutate({action:'delete',id:r.id});}} className="underline">Delete</button>}</div>}</td></tr>)}</tbody></table>{!rules.length&&<p className="p-4">No rules yet.</p>}</div>}
  </section>;
}