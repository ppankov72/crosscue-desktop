export default function ScaledSlider({label,ariaLabel,value,min,max,step,onChange}){
  return <label className="block">
    <span className="block text-xs font-bold tracking-widest text-[#e8dec5]">{label}</span>
    <input aria-label={ariaLabel||label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="mt-1 w-full accent-[#bb8d36]"/>
    <div className="mt-1 flex items-end gap-1">
      <span className="text-[10px] font-bold leading-none text-white">0</span>
      <div className="flex flex-1 items-end justify-between">
        {Array.from({length:21},(_,i)=><span key={i} style={{display:'block',width:'1px',background:'#fff',height:i%2===0?10:5,opacity:.85}}/>)}
      </div>
      <span className="text-[10px] font-bold leading-none text-white">10dB</span>
    </div>
  </label>;
}