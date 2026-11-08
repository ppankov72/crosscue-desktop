const ticks=['0.5','1','2','3','5','7','10 s'];

export default function TimingControl({label,value,onChange}){
 return <label className="block text-xs text-[#e8dec5]"><span className="flex items-baseline justify-between gap-3 font-bold tracking-wider"><span>{label}</span><span className="shrink-0 text-base font-bold text-[#ff2800]">{value.toFixed(1)} s</span></span><input aria-label={label} className="mt-2 w-full accent-[#bb8d36]" type="range" min=".5" max="10" step=".1" value={value} onChange={event=>onChange(event.target.value)}/><span className="mt-1 flex justify-between text-sm font-bold text-[#a49778]">{ticks.map(tick=><span key={tick}>{tick}</span>)}</span></label>;
}