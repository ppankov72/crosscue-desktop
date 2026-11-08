import { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, CheckCircle2, Save, Download, Trash2, Sliders, Disc, Radio, AlertCircle } from 'lucide-react';
import { autoDetector } from '@/lib/midi/autoDetector';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import { exportProfile } from '@/lib/midi/mappingProfile';
import { ALL_ACTIONS } from '@/lib/midi/actions';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

export default function AutoMappingWizard({ devices, lastMessage, onFinish, language }) {
  const { t } = useMidiTranslations(language);
  const [controls, setControls] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState({ id: '*', name: 'Unknown Controller', manufacturer: '' });
  const [lastActiveId, setLastActiveId] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'A', 'B', 'mixer', 'unconfirmed'
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAuthor, setProfileAuthor] = useState('Me');
  const [profileDescription, setProfileDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Subscribe to auto-detector events
  useEffect(() => {
    const unsubscribe = autoDetector.subscribe((list, devInfo, activeId) => {
      setControls([...list]);
      if (devInfo) setDeviceInfo(devInfo);
      setLastActiveId(activeId);
    });
    autoDetector.start();
    setIsScanning(true);

    return () => {
      unsubscribe();
      autoDetector.stop();
    };
  }, []);

  // Process incoming messages
  useEffect(() => {
    if (isScanning && lastMessage) {
      autoDetector.processMessage(lastMessage);
    }
  }, [lastMessage, isScanning]);

  // Set default profile name when device is detected
  useEffect(() => {
    const devName = devices[0]?.name || deviceInfo.name || 'DJ Console';
    if (!profileName) {
      setProfileName(`${devName} Custom Map`);
    }
  }, [devices, deviceInfo.name, profileName]);

  const handleToggleScan = () => {
    if (isScanning) {
      autoDetector.stop();
      setIsScanning(false);
    } else {
      autoDetector.start();
      setIsScanning(true);
    }
  };

  const handleReset = () => {
    if (window.confirm(t.wizard.confirmClear)) {
      autoDetector.reset();
    }
  };

  const handleConfirmAll = () => {
    autoDetector.confirmAll();
  };

  const handleTargetChange = (ctrlId, newTarget) => {
    autoDetector.setTarget(ctrlId, newTarget);
  };

  const handleDeleteControl = (ctrlId) => {
    autoDetector.removeControl(ctrlId);
  };

  const handleSaveToLibrary = () => {
    if (!profileName.trim()) return;
    const profile = autoDetector.buildProfile({
      name: profileName.trim(),
      author: profileAuthor.trim() || 'Me',
      description: profileDescription.trim(),
      model: deviceInfo.name || devices[0]?.name || '',
      manufacturer: deviceInfo.manufacturer || devices[0]?.manufacturer || ''
    });

    mappingLibraryStore.add('my', profile);
    mappingLibraryStore.activate(profile.id);

    setSaveSuccess(t.wizard.savedSuccess(profile.metadata.name));
    setTimeout(() => {
      setSaveModalOpen(false);
      setSaveSuccess(null);
      onFinish?.();
    }, 1600);
  };

  const handleExportJson = () => {
    const profile = autoDetector.buildProfile({
      name: profileName.trim() || 'Custom Mapping',
      author: profileAuthor.trim() || 'Me',
      description: profileDescription.trim(),
      model: deviceInfo.name || devices[0]?.name || ''
    });

    const json = exportProfile(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(profile.metadata.name || 'mapping').replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter controls
  const filteredControls = controls.filter(c => {
    if (filter === 'A') return c.deck === 'A';
    if (filter === 'B') return c.deck === 'B';
    if (filter === 'mixer') return c.confirmedTarget?.includes('CROSSFADER') || c.confirmedTarget?.includes('MASTER') || c.kind === 'fader';
    if (filter === 'unconfirmed') return !c.confirmedTarget;
    return true;
  });

  const confirmedCount = controls.filter(c => c.confirmedTarget).length;
  const suggestedCount = controls.filter(c => !c.confirmedTarget && c.suggestedTarget).length;

  return (
    <div className="space-y-4">
      {/* Header and Scan Controller Bar */}
      <div className="border border-[#515a63] bg-[#1a1e22] p-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-full ${isScanning ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'}`} />
              <b className="text-sm text-[#eee1c6]">
                {t.wizard.headerTitle}
              </b>
            </div>
            <p className="mt-0.5 text-xs text-[#a49778]">
              {t.wizard.deviceInfo(devices[0]?.name || deviceInfo.name, controls.length)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleScan}
              className={`mini-button px-3 ${isScanning ? 'vinyl-active text-amber-200' : 'text-stone-300'}`}
            >
              {isScanning ? <><Pause size={12} /> {t.wizard.pauseBtn}</> : <><Play size={12} /> {t.wizard.startScanBtn}</>}
            </button>
            <button
              onClick={handleConfirmAll}
              disabled={suggestedCount === 0}
              className="mini-button text-emerald-400 border-emerald-600/70 hover:bg-emerald-950/30"
              title={t.wizard.confirmAllTooltip}
            >
              <CheckCircle2 size={12} /> {t.wizard.confirmAllBtn(suggestedCount)}
            </button>
            <button
              onClick={handleReset}
              disabled={controls.length === 0}
              className="mini-button text-red-400 border-red-700/60"
              title={t.wizard.clearTooltip}
            >
              <RefreshCw size={12} /> {t.wizard.clearBtn}
            </button>
            <button
              onClick={() => setSaveModalOpen(true)}
              disabled={controls.length === 0}
              className="mini-button vinyl-active px-3 text-amber-300"
            >
              <Save size={12} /> {t.wizard.saveExportBtn}
            </button>
          </div>
        </div>

        {/* Guidance Notice */}
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-500/40 bg-amber-950/20 p-2 text-xs text-[#d1c5ac]">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <b>{t.wizard.guidanceTitle}</b> {t.wizard.guidanceDesc}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#515a63] pb-2 text-xs">
        <div className="flex gap-1">
          {[
            { id: 'all', label: t.wizard.tabAll(controls.length) },
            { id: 'A', label: t.wizard.tabDeckA(controls.filter(c => c.deck === 'A').length) },
            { id: 'B', label: t.wizard.tabDeckB(controls.filter(c => c.deck === 'B').length) },
            { id: 'unconfirmed', label: t.wizard.tabUnconfirmed(suggestedCount) }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`mini-button px-2.5 ${filter === f.id ? 'vinyl-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[#a49778]">
          {t.wizard.confirmedLabel} <span className="text-emerald-400 font-bold">{confirmedCount}</span> · {t.wizard.suggestedLabel} <span className="text-amber-400 font-bold">{suggestedCount}</span>
        </div>
      </div>

      {/* Controls Grid */}
      {filteredControls.length === 0 ? (
        <div className="border border-dashed border-[#515a63] p-10 text-center text-xs text-[#a49778]">
          <Sliders className="mx-auto mb-2 h-7 w-7 text-stone-500" />
          <p className="text-[#eee1c6] font-medium">{t.wizard.noControlsTitle}</p>
          <p className="mt-1">{t.wizard.noControlsDesc}</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredControls.map(ctrl => {
            const isLastActive = lastActiveId === ctrl.id;
            const target = ctrl.confirmedTarget || ctrl.suggestedTarget;
            const isConfirmed = Boolean(ctrl.confirmedTarget);
            const alternatives = autoDetector.getAlternativesFor(ctrl);

            return (
              <div
                key={ctrl.id}
                className={`relative rounded border p-2.5 text-xs transition-all ${
                  isLastActive
                    ? 'border-amber-400 bg-[#252a30] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : isConfirmed
                    ? 'border-emerald-600/50 bg-[#171b1f]'
                    : 'border-[#515a63] bg-[#1a1e22]'
                }`}
              >
                {/* Real-time active badge */}
                {isLastActive && (
                  <span className="absolute right-2 top-2 rounded bg-amber-500 px-1 py-0.2 text-[9px] font-bold text-black animate-pulse">
                    LIVE SIGNAL
                  </span>
                )}

                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {ctrl.kind === 'jog_wheel' ? (
                      <Disc size={14} className="text-amber-400" />
                    ) : ctrl.kind === 'fader' ? (
                      <Sliders size={14} className="text-sky-400" />
                    ) : (
                      <Radio size={14} className="text-emerald-400" />
                    )}
                    <span className="font-bold text-[#f3e48a]">
                      {ctrl.kind === 'jog_wheel'
                        ? 'JOG ROTATION'
                        : ctrl.kind === 'jog_touch'
                        ? 'JOG TOUCH SENSOR'
                        : ctrl.kind === 'fader'
                        ? 'SLIDER / FADER'
                        : ctrl.kind === 'knob'
                        ? 'ROTARY KNOB'
                        : 'BUTTON'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-stone-400">
                    CH{ctrl.channel} · {ctrl.type.toUpperCase()} #{ctrl.number}
                  </span>
                </div>

                {/* Telemetry Bar */}
                <div className="my-1.5 rounded bg-black/40 p-1.5 border border-[#30373e]">
                  <div className="flex justify-between text-[10px] text-[#a49778] mb-0.5">
                    <span>{t.wizard.currentValue} <b className="text-white">{ctrl.currentValue}</b></span>
                    <span>{t.wizard.range} {ctrl.minValue} – {ctrl.maxValue}</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${ctrl.kind === 'jog_wheel' ? 'bg-amber-400' : 'bg-emerald-400'} transition-all`}
                      style={{ width: `${Math.min(100, Math.max(5, (ctrl.currentValue / 127) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Suggested CrossCue Action */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#a49778]">{t.wizard.crosscueFunction}</span>
                    {ctrl.confidence === 'high' && (
                      <span className="text-[9px] text-emerald-400 font-bold">{t.wizard.highConfidence}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={target}
                      onChange={e => handleTargetChange(ctrl.id, e.target.value)}
                      className={`source-input w-full py-1 text-xs font-bold ${
                        isConfirmed ? 'text-emerald-300 border-emerald-500/70' : 'text-[#f3e48a] border-amber-500/60'
                      }`}
                    >
                      <optgroup label={t.wizard.recommendedGroup}>
                        {alternatives.map(alt => (
                          <option key={alt} value={alt}>{alt}</option>
                        ))}
                      </optgroup>
                      <optgroup label={t.wizard.allFunctionsGroup}>
                        {ALL_ACTIONS.filter(a => !alternatives.includes(a.id)).map(a => (
                          <option key={a.id} value={a.id}>{a.id} ({a.label})</option>
                        ))}
                      </optgroup>
                    </select>

                    {!isConfirmed && (
                      <button
                        onClick={() => handleTargetChange(ctrl.id, ctrl.suggestedTarget)}
                        className="mini-button text-emerald-300 border-emerald-600/70 hover:bg-emerald-950/40 shrink-0"
                        title={t.wizard.confirmSuggestionTooltip}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteControl(ctrl.id)}
                      className="mini-button text-stone-400 hover:text-red-400 shrink-0"
                      title={t.wizard.removeControlTooltip}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {ctrl.confidenceReason && (
                    <p className="text-[10px] text-[#a49778] italic truncate">
                      {ctrl.confidenceReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SAVE / EXPORT MODAL DIALOG */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded border border-amber-500/70 bg-[#1c2126] p-4 text-xs shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#515a63] pb-2">
              <b className="deck-label text-amber-400">{t.wizard.saveDialogTitle}</b>
              <button className="text-stone-400 hover:text-white" onClick={() => setSaveModalOpen(false)}>✕</button>
            </div>

            <p className="text-stone-300">
              {t.wizard.saveDialogDesc(controls.length)}
            </p>

            <div>
              <label className="block text-[#a49778] mb-1">{t.wizard.profileNameLabel}</label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="source-input w-full px-2 py-1.5 text-xs text-white"
                placeholder={t.wizard.profileNamePlaceholder}
              />
            </div>

            <div>
              <label className="block text-[#a49778] mb-1">{t.wizard.authorLabel}</label>
              <input
                type="text"
                value={profileAuthor}
                onChange={e => setProfileAuthor(e.target.value)}
                className="source-input w-full px-2 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[#a49778] mb-1">{t.wizard.descriptionLabel}</label>
              <textarea
                value={profileDescription}
                onChange={e => setProfileDescription(e.target.value)}
                rows={2}
                placeholder={t.wizard.descriptionPlaceholder}
                className="source-input w-full px-2 py-1.5 text-xs text-white"
              />
            </div>

            {saveSuccess && (
              <p className="text-emerald-400 font-bold flex items-center gap-1 pt-1">
                <CheckCircle2 size={14} /> {saveSuccess}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#515a63]">
              <button
                onClick={handleExportJson}
                className="mini-button text-stone-200 border-stone-500 hover:bg-stone-800"
              >
                <Download size={12} /> {t.wizard.downloadJsonBtn}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={!profileName.trim()}
                className="mini-button vinyl-active px-3 text-amber-200"
              >
                <Save size={12} /> {t.wizard.saveToMyMappingsBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}