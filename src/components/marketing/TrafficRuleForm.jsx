import { useState } from 'react';
const empty={rule_type:'user_id',value:'',traffic_class:'internal',enabled:true,notes:''};
export default function TrafficRuleForm({rule,onSave,onCancel,busy}) {
  const [draft,setDraft]=useState(rule||empty);
  const update=(key,value)=>setDraft(d=>({...d,[key]:value}));
  return <form className="space-y-3 rounded-xl border border-border bg-card p-4" onSubmit={e=>{e.preventDefault();onSave(draft);}}>
    <h3 className="font-bold">{rule?'Edit rule':'Add traffic rule'}</h3>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Type<select className="mt-1 w-full rounded border border-border bg-background p-2" value={draft.rule_type} onChange={e=>update('rule_type',e.target.value)}>{['user_agent','ip','domain','environment','user_id','role','browser_identity','automated_pattern','utm_source'].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label className="text-sm">Value<input required maxLength={255} className="mt-1 w-full rounded border border-border p-2" value={draft.value} onChange={e=>update('value',e.target.value)}/></label>
    <label className="text-sm">Classification<select className="mt-1 w-full rounded border border-border p-2" value={draft.traffic_class} onChange={e=>update('traffic_class',e.target.value)}><option value="real">Real (allow rule)</option><option value="internal">Internal</option><option value="test">Test</option><option value="bot">Bot / Automated</option></select></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e=>update('enabled',e.target.checked)}/>Enabled</label>
    <label className="block text-sm">Notes<textarea maxLength={1000} className="mt-1 w-full rounded border border-border p-2" value={draft.notes||''} onChange={e=>update('notes',e.target.value)}/></label>
    <p className="text-xs text-muted-foreground">User-agent: pipe-separated substrings, no regex. IP: exact address; datacenter/cloud IPs are never automatically blocked. Domain/referrer: hostname including subdomains. Browser identity: anonymous/installation ID. Automated pattern: webdriver or frequency:N (requests per browser in 60 seconds). Default detectors can be edited or disabled; Real rules allow exceptions, but verified owner/admin stays Internal. Reclassify to update history.</p>
    <div className="flex gap-2"><button disabled={busy} className="rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{busy?'Saving…':'Save rule'}</button><button type="button" disabled={busy} onClick={onCancel} className="rounded border border-border px-4 py-2 text-sm">Cancel</button></div>
  </form>;
}