import { useState } from 'react';
import { Save, Download, Check } from 'lucide-react';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import { createProfile, createEntry, exportProfile } from '@/lib/midi/mappingProfile';
import { ACTION_MAP } from '@/lib/midi/actions';
import { matchesMapping } from '@/lib/midi/mappings';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

const controls=['PLAY A','CUE A','SYNC A','LOAD A','JOG A','JOG TOUCH A','PITCH A','PITCH - A','PITCH + A','GAIN A','HIGH A','MID A','LOW A','FILTER A','CHANNEL FADER A','LOOP A','REPLAY A','VINYL A','KEY LOCK A','CUE 1 A','CUE 2 A',...Array.from({length:8},(_,index)=>`SAMPLER A PAD ${index+1}`),'PLAY B','CUE B','SYNC B','LOAD B','JOG B','JOG TOUCH B','PITCH B','PITCH - B','PITCH + B','GAIN B','HIGH B','MID B','LOW B','FILTER B','CHANNEL FADER B','LOOP B','REPLAY B','VINYL B','KEY LOCK B','CUE 1 B','CUE 2 B',...Array.from({length:8},(_,index)=>`SAMPLER B PAD ${index+1}`),'CROSSFADER','MASTER','HEADPHONES','BOOTH','CUE / MASTER MIX','AUTO DJ','SHUFFLE'];
const modes=['toggle','momentary','trigger','continuous'];
const title=id=>id.replace(/ ([AB])$/,' $1');

export default function MidiPanel({open,onClose,status,devices,message,mappings,learnTarget,onLearn,onEdit,onDelete,onClear,onOpenMappingManager,language}){
  const { t } = useMidiTranslations(language);
  const [confirm,setConfirm]=useState(false);
  const [showSaveDialog,setShowSaveDialog]=useState(false);
  const [saveName,setSaveName]=useState('');
  const [saveAuthor,setSaveAuthor]=useState('Me');
  const [saveFeedback,setSaveFeedback]=useState(null);

  if(!open)return null;
  const state=status==='unavailable'?t.panel.statusUnavailable:status==='denied'?t.panel.statusDenied:devices.length?t.panel.statusDevices:t.panel.statusNoDevices;

  const defaultDeviceName = devices[0]?.name || (mappings[0]?.deviceName) || 'Pioneer DDJ-200';

  const handleOpenSaveDialog = () => {
    setSaveName(defaultDeviceName + ' Custom');
    setShowSaveDialog(true);
    setSaveFeedback(null);
  };

  const handleSaveAsProfile = () => {
    if (!saveName.trim()) return;
    const entries = mappings.map(m => createEntry({
      deviceId: m.deviceId || '*',
      deviceName: m.deviceName || defaultDeviceName,
      manufacturer: m.manufacturer || '',
      channel: m.channel,
      type: m.type,
      number: m.number,
      mode: m.mode,
      target: m.target,
      controlType: ACTION_MAP[m.target]?.controlType || (m.mode === 'continuous' ? 'fader' : 'button'),
      status: 'supported'
    }));

    const profile = createProfile({
      name: saveName.trim(),
      author: saveAuthor.trim() || 'Me',
      manufacturer: mappings[0]?.manufacturer || '',
      model: mappings[0]?.deviceName || '',
      status: 'tested',
      sourceFormat: 'manual',
      sourceApplication: 'CROSSCUE'
    }, entries);

    mappingLibraryStore.add('my', profile);
    mappingLibraryStore.activate(profile.id);

    setSaveFeedback(t.panel.savedFeedback(profile.metadata.name));
    setTimeout(() => {
      setShowSaveDialog(false);
      setSaveFeedback(null);
    }, 1800);
  };

  const handleExportJson = () => {
    const entries = mappings.map(m => createEntry({
      deviceId: m.deviceId || '*',
      deviceName: m.deviceName || defaultDeviceName,
      channel: m.channel,
      type: m.type,
      number: m.number,
      mode: m.mode,
      target: m.target,
      controlType: ACTION_MAP[m.target]?.controlType || (m.mode === 'continuous' ? 'fader' : 'button'),
      status: 'supported'
    }));

    const profile = createProfile({
      name: saveName.trim() || (defaultDeviceName + ' Mapping'),
      author: saveAuthor.trim() || 'Me',
      sourceFormat: 'crosscue-native'
    }, entries);

    const json = exportProfile(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(profile.metadata.name || 'crosscue-mapping').replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-[#515a63] bg-[#171b1f] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#515a63] p-4">
          <b className="deck-label">{t.panel.devicesTitle}</b>
          <div className="flex items-center gap-1">
            <a href="/midi-guide" target="_blank" rel="noopener noreferrer" className="mini-button text-amber-400 border-amber-600/60" title={t.panel.guideTooltip}>{t.panel.guideBtn}</a>
            {onOpenMappingManager&&<button className="mini-button text-amber-300 border-amber-500/70 hover:bg-amber-950/40" onClick={()=>onOpenMappingManager('auto')}>{t.panel.autoDetectBtn}</button>}
            {onOpenMappingManager&&<button className="mini-button" onClick={()=>onOpenMappingManager('library')}>{t.panel.mappingManagerBtn}</button>}
            <button className="mini-button" onClick={onClose}>{t.panel.closeBtn}</button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <p className="text-xs font-bold text-[#ff2800]">{state}</p>
          {devices.map(device=>(
            <div key={device.id} className="border border-[#515a63] p-2 text-xs">
              <b>● {device.name} — {device.state?.toUpperCase()}</b>
              <p className="text-[#a49778]">{device.manufacturer||t.panel.manufacturerUnavailable} · {t.panel.enabledStatus}</p>
            </div>
          ))}

          {/* MIDI LEARN SECTION */}
          <section>
            <b className="deck-label">{t.panel.learnTitle}</b>
            <p className="mt-1 text-xs text-[#a49778]">
              {learnTarget?t.panel.learningTarget(title(learnTarget)):t.panel.learnInstruction}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {controls.map(control=>(
                <button
                  key={control}
                  onClick={()=>onLearn(control)}
                  className={`mini-button justify-start ${learnTarget===control?'vinyl-active':''}`}
                >
                  {control}
                </button>
              ))}
            </div>
          </section>

          {/* MIDI MONITOR */}
          <section>
            <b className="deck-label">{t.panel.monitorTitle}</b>
            <div className="mt-1 text-xs">
              {message?(
                <>
                  <p>DEV: {message.device.name}</p>
                  <p>CH: {message.channel} · TYPE: {message.type.toUpperCase()} · NUM: {message.number} · VAL: {message.value}</p>
                  {(message.number === 33 || message.number === 34 || message.number === 35 || message.number === 36) && (
                    <p className="text-amber-400 font-bold mt-1">
                      JOG DIAL ACTIVITY: {message.value > 64 ? `CW (Forward +${message.value - 64})` : message.value < 64 ? `CCW (Reverse -${64 - message.value})` : 'STOP (Center 64)'}
                    </p>
                  )}
                  {message.number === 54 && (
                    <p className="text-amber-400 font-bold mt-1">
                      JOG TOUCH SENSOR: {message.type === 'noteon' && message.value > 0 ? 'TOUCH ACTIVE (Platter Held)' : 'TOUCH RELEASED'}
                    </p>
                  )}
                  <p className="mt-1">
                    {mappings.filter(m => matchesMapping(m, message)).length > 0 ? (
                      <span className="text-[#d5ad58] font-bold">
                        → {mappings.filter(m => matchesMapping(m, message)).map(m => m.target).join(', ')}
                      </span>
                    ) : (
                      <span className="text-[#a49778]">→ {t.panel.noMatch}</span>
                    )}
                  </p>
                </>
              ):<p>{t.panel.waitingInput}</p>}
            </div>
          </section>

          {/* MIDI MAPPINGS WITH SAVE AS & EXPORT */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#515a63]/70 pb-2">
              <div className="flex items-center gap-2">
                <b className="deck-label">{t.panel.mappingsTitle}</b>
                <span className="text-xs text-[#a49778]">({mappings.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {mappings.length > 0 && (
                  <button
                    className="mini-button text-amber-300 border-amber-600/70 hover:bg-amber-950/40"
                    onClick={handleOpenSaveDialog}
                    title={t.panel.saveAsTooltip}
                  >
                    <Save size={12} /> {t.panel.saveAsBtn}
                  </button>
                )}
                {confirm?(
                  <span className="flex gap-1">
                    <button className="mini-button text-red-400 border-red-600" onClick={()=>{onClear(); setConfirm(false);}}>{t.panel.confirmBtn}</button>
                    <button className="mini-button" onClick={()=>setConfirm(false)}>{t.panel.cancelBtn}</button>
                  </span>
                ):(
                  <button className="mini-button" onClick={()=>setConfirm(true)}>{t.panel.clearAllBtn}</button>
                )}
              </div>
            </div>

            {/* SAVE AS MODAL / INLINE DRAWER */}
            {showSaveDialog && (
              <div className="mt-3 rounded border border-amber-500/60 bg-[#20252b] p-3 text-xs shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Save size={14} /> {t.panel.saveProfileTitle}
                  </span>
                  <button className="text-stone-400 hover:text-white" onClick={()=>setShowSaveDialog(false)}>✕</button>
                </div>
                <p className="text-stone-300">
                  {t.panel.saveProfileDesc(mappings.length)}
                </p>
                <div>
                  <label className="block text-[#a49778] mb-1">{t.panel.profileNameLabel}</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e=>setSaveName(e.target.value)}
                    placeholder={t.panel.profileNamePlaceholder}
                    className="source-input w-full px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#a49778] mb-1">{t.panel.authorLabel}</label>
                  <input
                    type="text"
                    value={saveAuthor}
                    onChange={e=>setSaveAuthor(e.target.value)}
                    className="source-input w-full px-2 py-1.5 text-xs text-white"
                  />
                </div>
                {saveFeedback && (
                  <p className="text-emerald-400 font-bold flex items-center gap-1 pt-1">
                    <Check size={14} /> {saveFeedback}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="mini-button text-stone-300"
                    onClick={handleExportJson}
                    title={t.panel.exportJsonTooltip}
                  >
                    <Download size={12} /> {t.panel.exportJsonBtn}
                  </button>
                  <button
                    className="mini-button vinyl-active px-3 text-amber-200"
                    onClick={handleSaveAsProfile}
                    disabled={!saveName.trim()}
                  >
                    <Save size={12} /> {t.panel.saveToLibraryBtn}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1">
              {mappings.length ? mappings.map(mapping=>(
                <div key={mapping.id} className="flex items-center justify-between border border-[#515a63] p-2 text-xs">
                  <div>
                    <span className="font-bold text-[#f3e48a]">{mapping.target}</span>
                    <span className="text-[#a49778] ml-2">({mapping.deviceName})</span>
                    <div className="text-[11px] text-stone-300 mt-0.5">
                      CH{mapping.channel} {mapping.type.toUpperCase()} #{mapping.number} ·{' '}
                      <select
                        className="source-input py-0 px-1 text-[11px] inline-block"
                        value={mapping.mode}
                        onChange={event=>onEdit(mapping.id,{mode:event.target.value})}
                      >
                        {modes.map(mode=>(
                          <option key={mode} value={mode}>{mode.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button className="mini-button" onClick={()=>onDelete(mapping.id)}>{t.panel.deleteBtn}</button>
                </div>
              )) : (
                <p className="text-xs text-[#a49778]">{t.panel.noMappings}</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}