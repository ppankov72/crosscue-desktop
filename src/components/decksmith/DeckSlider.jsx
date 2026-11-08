export default function DeckSlider({label,value,onChange,min=0,max=1,step=.01,disabled=false,format}){
  return <label className="flex min-w-0 flex-1 flex-col gap-1">
    <span className="flex items-center justify-between text-[10px] font-bold tracking-wider text-[#a49778]">
      <span>{label}</span>
      <span className="font-mono text-[#ff2800]">{format?format(value):value}</span>
    </span>
    <input disabled={disabled} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full"/>
  </label>;
}