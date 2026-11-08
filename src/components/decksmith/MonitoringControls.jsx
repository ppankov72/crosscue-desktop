import { dbToGain, gainToDb } from '@/lib/decksmith/audioMath';
import ScaledSlider from './ScaledSlider';
export default function MonitoringControls({audio,onUpdate}){
  const dbSlider=(label,key)=>{
    const db=gainToDb(audio[key]);
    const value=Number.isFinite(db)?Math.max(-60,Math.min(10,db)):-60;
    return <ScaledSlider label={label} ariaLabel={label} min="-60" max="10" step=".1" value={value} onChange={v=>onUpdate({[key]:dbToGain(v)})}/>;
  };
  return <div className="mt-3 border-t border-[#6d6045] pt-3 text-sm font-semibold">
    <div className="grid grid-cols-2 gap-2">
      {dbSlider('MASTER','masterGain')}
      {dbSlider('HEADPHONES','headphoneLevel')}
      {dbSlider('BOOTH','boothLevel')}
    </div>
    <div className="mt-2"><ScaledSlider label="CUE / MASTER MIX" ariaLabel="Cue to master monitor mix" min="0" max="1" step=".01" value={audio.headphoneMix} onChange={v=>onUpdate({headphoneMix:v})}/></div>
    <p className="mt-2 text-[#a49778]">Separate headphone and booth outputs are unavailable in this browser/device configuration.</p>
  </div>;
}