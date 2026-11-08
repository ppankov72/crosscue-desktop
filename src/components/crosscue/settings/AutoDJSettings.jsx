import TimingControl from './TimingControl';

export default function AutoDJSettings({settings,onUpdate}){
 const number=(key,value)=>onUpdate({[key]:Math.max(.5,Math.min(10,Number(value)||.5))});
 return <div className="space-y-5"><h2 className="deck-label">AUTO DJ TIMING</h2><TimingControl label="START BEFORE END" value={settings.transitionStart} onChange={value=>number('transitionStart',value)}/><TimingControl label="CROSSFADE DURATION" value={settings.crossfadeDuration} onChange={value=>number('crossfadeDuration',value)}/><div><p className="mb-2 text-xs">Queue Mode</p><div className="flex gap-1">{[['playlist','Playlist Order'],['shuffle','Shuffle']].map(([value,label])=><button key={value} onClick={()=>onUpdate({queueMode:value})} className={`mini-button flex-1 ${settings.queueMode===value?'vinyl-active':''}`}>{label}</button>)}</div></div></div>;
}