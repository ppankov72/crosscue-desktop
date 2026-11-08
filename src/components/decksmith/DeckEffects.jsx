import DeckSlider from './DeckSlider';

export default function DeckEffects({deck,onUpdate,onLoop}){
 const disabled=deck.type!=='local';
 const beats=[1,2,4,8];
 return <div data-deck-effects className="mt-5 border-t border-[#4b4434] pt-3">
  <div className="flex items-start justify-between gap-2">
   <span className="pt-1 text-[10px] font-bold tracking-[.2em] text-[#a49778]">PERFORMANCE / FX</span>
   <div className="flex flex-1 justify-end gap-2">
    <DeckSlider label="FILTER" value={deck.filter ?? 20000} min={100} max={20000} step={100} disabled={disabled} onChange={filter=>onUpdate({filter})} format={v=>{const n=Number(v)||0; return n>=1000?`${(n/1000).toFixed(1)}k`:String(Math.round(n));}}/>
    <DeckSlider label="ECHO" value={deck.echo ?? 0} min={0} max={1} step={.05} disabled={disabled} onChange={echo=>onUpdate({echo})} format={v=>`${Math.round((Number(v)||0)*100)}%`}/>
    <DeckSlider label="REVERB" value={deck.reverb ?? 0} min={0} max={1} step={.05} disabled={disabled} onChange={reverb=>onUpdate({reverb})} format={v=>`${Math.round((Number(v)||0)*100)}%`}/>
   </div>
  </div>
  <div className="mt-2 flex items-center justify-between border-t border-[#4b4434] pt-2">
   <span className="text-[10px] font-bold tracking-widest text-[#a49778]">BEAT LOOP</span>
   <div className="flex gap-1">{beats.map(beats=><button key={beats} disabled={disabled} className={`mini-button ${deck.loop?.active&&deck.loop.beats===beats?'vinyl-active':''}`} onClick={()=>onLoop(beats)}>{beats}</button>)}</div>
  </div>
  </div>;
 }