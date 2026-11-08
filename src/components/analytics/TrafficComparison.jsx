const human=value=>String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
function metrics(data,prefix='',out={}) {
  if(!data||typeof data!=='object')return out;
  Object.entries(data).forEach(([key,value])=>{
    if(['recentVisitors','links','communitySubmissions','intelligence','lessons','voucherSummary','markers','lat','lon','latitude','longitude'].includes(key))return;
    const path=prefix?`${prefix} / ${human(key)}`:human(key);
    if(typeof value==='number'&&Number.isFinite(value))out[path]=value;
    else if(Array.isArray(value))value.forEach((row,i)=>{const name=[row.name||row.date||row.source||row.type||row.country||row.city||i,row.detail].filter(v=>v!==undefined&&v!=='').join(' · ');metrics(row,`${path} / ${name}`,out);});
    else if(value&&typeof value==='object')metrics(value,path,out);
  });
  return out;
}
export default function TrafficComparison({comparison}) {
  if(!comparison)return null;
  const all=metrics(comparison.all),real=metrics(comparison.real);
  const keys=[...new Set([...Object.keys(all),...Object.keys(real)])];
  const number=v=>v.toLocaleString(undefined,{maximumFractionDigits:3});
  return <section className="rounded-xl border border-border bg-card p-5 text-card-foreground"><h2 className="mb-3 text-sm font-bold">All traffic vs Real traffic</h2><div className="max-h-[32rem] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-card"><tr>{['Metric','All traffic','Real traffic','Difference','Difference %'].map(t=><th key={t} className="border-b border-border p-2">{t}</th>)}</tr></thead><tbody>{keys.map(key=>{const a=all[key]||0,r=real[key]||0,d=a-r;return <tr key={key}><td className="border-b border-border p-2">{key}</td><td className="p-2 tabular-nums">{number(a)}</td><td className="p-2 tabular-nums">{number(r)}</td><td className="p-2 tabular-nums">{number(d)}</td><td className="p-2 tabular-nums">{a?number(d/a*100)+'%':'—'}</td></tr>;})}</tbody></table></div></section>;
}