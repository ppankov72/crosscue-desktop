import DJIdentitySettings from './DJIdentitySettings';
import FlagThemeGrid from '@/components/crosscue/FlagThemeGrid';
import CustomChassisSection from '@/components/crosscue/CustomChassisSection';
const Toggle=({label,checked,onChange})=><label className="flex items-center justify-between text-xs"><span>{label}</span><input className="accent-[#ff2800]" type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>;
export default function InterfaceSettings({settings,onUpdate,onFullscreen}){return <div className="space-y-4"><h2 className="deck-label">INTERFACE</h2>
{/* Existing themes */}
<div><p className="mb-2 text-xs">Theme</p><div className="flex gap-1"><button onClick={()=>onUpdate({theme:'crosscue'})} className={`mini-button flex-1 ${settings.theme==='crosscue'?'vinyl-active':''}`}>CROSSCUE Metal</button><button onClick={()=>onUpdate({theme:'decksmith'})} className={`mini-button flex-1 ${settings.theme==='decksmith'?'vinyl-active':''}`}>Classic</button><button onClick={()=>onUpdate({theme:'denim'})} className={`mini-button flex-1 ${settings.theme==='denim'?'vinyl-active':''}`}>DENIM</button></div></div>
{/* National flag themes */}
<div><p className="mb-2 text-xs font-bold text-[#d5ad58]">National Flag Themes</p><p className="mb-2 text-[10px] text-[#a49778]">Hybrid — panels &amp; accents get flag colors; VU meters, platter &amp; faders stay neutral.</p><FlagThemeGrid current={settings.theme} onSelect={theme=>onUpdate({theme})}/></div>
{/* Custom chassis — deck panels only */}
<div><p className="mb-2 text-xs font-bold text-[#d5ad58]">Custom Deck Chassis</p><CustomChassisSection customChassis={settings.customChassis} onUpdate={values=>onUpdate({...values})}/></div>
<DJIdentitySettings settings={settings} onUpdate={onUpdate}/>
<Toggle label="Show VU meters" checked={settings.showVUMeters} onChange={showVUMeters=>onUpdate({showVUMeters})}/>
<Toggle label="Show video when loading YouTube" checked={settings.showVideoOnLoad} onChange={showVideoOnLoad=>onUpdate({showVideoOnLoad})}/>
<Toggle label="Show waveform for supported local sources" checked={settings.showWaveform} onChange={showWaveform=>onUpdate({showWaveform})}/>
<Toggle label="Fullscreen" checked={settings.fullscreen} onChange={onFullscreen}/>
</div>}