import { useState, useEffect } from 'react';
import { createProfile, createEntry, computeStats, detectConflicts, exportProfile } from '@/lib/midi/mappingProfile';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import { ACTION_MAP } from '@/lib/midi/actions';
import ActionBrowser from './ActionBrowser';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

// Manual Mapping Editor — create or edit a mapping using MIDI Learn.
// Reuses the existing midiManager for message capture (no duplicate engine).
export default function ManualMappingEditor({ profile, devices, lastMessage, onClose, language }) {
  const { t } = useMidiTranslations(language);
  const isEdit = Boolean(profile);
  const [metadata, setMetadata] = useState(
    profile?.metadata || {
      manufacturer: '',
      model: '',
      name: '',
      author: 'Me',
      version: '1.0',
      description: '',
      status: 'experimental',
    }
  );
  const [entries, setEntries] = useState(profile?.entries || []);
  const [learnId, setLearnId] = useState(null);
  const [assignId, setAssignId] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  // Capture MIDI for the entry being learned
  useEffect(() => {
    if (learnId && lastMessage) {
      // Ignore noteoff messages during learn to prevent capturing release instead of press
      if (lastMessage.type === 'noteoff') return;
      setEntries(prev =>
        prev.map(e =>
          e.id === learnId
            ? {
                ...e,
                deviceId: lastMessage.device.id,
                deviceName: lastMessage.device.name,
                manufacturer: lastMessage.device.manufacturer || '',
                channel: lastMessage.channel,
                type: lastMessage.type,
                number: lastMessage.number,
                mode: lastMessage.type === 'cc' ? 'continuous' : e.mode,
                status: 'supported',
              }
            : e
        )
      );
      setLearnId(null);
    }
  }, [learnId, lastMessage]);

  useEffect(() => {
    setConflicts(detectConflicts(entries));
  }, [entries]);

  const addEntry = () => {
    const entry = createEntry({ target: '', status: 'unresolved' });
    setEntries(prev => [...prev, entry]);
    setLearnId(entry.id);
  };

  const updateEntry = (id, data) =>
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...data } : e)));

  const deleteEntry = id =>
    setEntries(prev => prev.filter(e => e.id !== id));

  const assignAction = (id, actionId) => {
    const action = ACTION_MAP[actionId];
    if (!action) return;
    updateEntry(id, {
      target: actionId,
      controlType: action.controlType,
      mode: action.mode,
      status: 'supported',
    });
    setAssignId(null);
  };

  const handleSave = () => {
    if (!metadata.name.trim()) {
      alert(t.editor.enterNameAlert);
      return;
    }
    if (!entries.length) {
      alert(t.editor.addEntryAlert);
      return;
    }
    if (isEdit) {
      mappingLibraryStore.update(profile.id, { metadata, entries });
    } else {
      const newProfile = createProfile(
        { ...metadata, sourceFormat: 'manual', sourceApplication: 'CROSSCUE' },
        entries
      );
      mappingLibraryStore.add('my', newProfile);
    }
    onClose();
  };

  const handleExport = () => {
    const p = createProfile(metadata, entries);
    const json = exportProfile(p);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(metadata.name || 'mapping').replace(/\s+/g, '_')}.crosscue-map`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = computeStats(entries);

  return (
    <div className="space-y-4">
      {/* Metadata form */}
      <div className="border border-[#515a63] bg-[#1a1e22] p-3">
        <b className="deck-label">{isEdit ? t.editor.editTitle : t.editor.createTitle}</b>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs">
            {t.editor.mappingNameLabel}
            <input className="source-input mt-1 block w-full" value={metadata.name} onChange={e => setMetadata({ ...metadata, name: e.target.value })} placeholder="e.g. VMS4 Custom" />
          </label>
          <label className="text-xs">
            {t.editor.manufacturerLabel}
            <input className="source-input mt-1 block w-full" value={metadata.manufacturer} onChange={e => setMetadata({ ...metadata, manufacturer: e.target.value })} placeholder="e.g. American Audio" />
          </label>
          <label className="text-xs">
            {t.editor.modelLabel}
            <input className="source-input mt-1 block w-full" value={metadata.model} onChange={e => setMetadata({ ...metadata, model: e.target.value })} placeholder="e.g. VMS4" />
          </label>
          <label className="text-xs">
            {t.editor.authorLabel}
            <input className="source-input mt-1 block w-full" value={metadata.author} onChange={e => setMetadata({ ...metadata, author: e.target.value })} />
          </label>
          <label className="text-xs">
            {t.editor.versionLabel}
            <input className="source-input mt-1 block w-full" value={metadata.version} onChange={e => setMetadata({ ...metadata, version: e.target.value })} />
          </label>
          <label className="text-xs">
            {t.editor.statusLabel}
            <select className="source-input mt-1 block w-full" value={metadata.status} onChange={e => setMetadata({ ...metadata, status: e.target.value })}>
              <option value="experimental">{t.editor.experimental}</option>
              <option value="tested">{t.editor.tested}</option>
            </select>
          </label>
        </div>
        <label className="mt-2 block text-xs">
          {t.editor.descriptionLabel}
          <textarea className="source-input mt-1 block w-full" rows={2} value={metadata.description} onChange={e => setMetadata({ ...metadata, description: e.target.value })} />
        </label>
      </div>

      {/* Device info */}
      <div className="text-xs text-[#a49778]">
        {t.editor.detectedDevices} {devices.length ? devices.map(d => d.name).join(', ') : t.editor.noDevices}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="border border-amber-500 bg-amber-900/20 p-2 text-xs text-amber-400">
          {t.editor.conflictsDetected(conflicts.length)}
        </div>
      )}

      {/* Entry list */}
      <div>
        <div className="flex items-center justify-between">
          <b className="deck-label">{t.editor.entriesTitle(entries.length)}</b>
          <button className="mini-button" onClick={addEntry}>{t.editor.addEntryBtn}</button>
        </div>
        <div className="mt-2 space-y-1">
          {entries.map(e => (
            <div key={e.id} className="border border-[#515a63] bg-[#1a1e22] p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-[#a49778]">
                    CH
                    <input
                      type="number"
                      min="1"
                      max="16"
                      className="source-input w-12 py-0 text-center font-mono"
                      value={e.channel}
                      onChange={ev => updateEntry(e.id, { channel: Math.max(1, Math.min(16, parseInt(ev.target.value, 10) || 1)) })}
                    />
                  </label>
                  <select
                    className="source-input py-0 uppercase"
                    value={e.type}
                    onChange={ev => updateEntry(e.id, { type: ev.target.value })}
                  >
                    <option value="cc">CC</option>
                    <option value="noteon">NOTEON</option>
                    <option value="noteoff">NOTEOFF</option>
                  </select>
                  <label className="flex items-center gap-1 text-[#a49778]">
                    NUM
                    <input
                      type="number"
                      min="0"
                      max="127"
                      className="source-input w-14 py-0 text-center font-mono"
                      value={e.number}
                      onChange={ev => updateEntry(e.id, { number: Math.max(0, Math.min(127, parseInt(ev.target.value, 10) || 0)) })}
                    />
                  </label>
                  {e.deviceName && <span className="text-[#a49778]">· {e.deviceName}</span>}
                </div>
                <div className="flex gap-1">
                  <button
                    className={`mini-button ${learnId === e.id ? 'vinyl-active' : ''}`}
                    onClick={() => setLearnId(learnId === e.id ? null : e.id)}
                  >
                    {learnId === e.id ? t.editor.learning : t.editor.learnBtn}
                  </button>
                  <button className="mini-button" onClick={() => setAssignId(assignId === e.id ? null : e.id)}>
                    {e.target || t.editor.assignBtn}
                  </button>
                  <button className="mini-button text-red-400" onClick={() => deleteEntry(e.id)}>{t.editor.delBtn}</button>
                </div>
              </div>
              {learnId === e.id && (
                <div className="mt-1.5 flex items-center gap-2 rounded border border-amber-500/50 bg-amber-950/40 p-1.5 text-amber-300 animate-pulse">
                  <span className="font-bold">{t.editor.waitingInput}</span>
                  <span className="text-[11px] text-[#eee1c6]">{t.editor.waitingInputDesc}</span>
                </div>
              )}
              {assignId === e.id && (
                <div className="mt-1">
                  <ActionBrowser compact language={language} selected={e.target} onSelect={actionId => assignAction(e.id, actionId)} />
                  <button className="mini-button mt-1" onClick={() => setAssignId(null)}>{t.editor.doneBtn}</button>
                </div>
              )}
              {e.target && (
                <div className="mt-1 flex items-center justify-between text-[#d5ad58]">
                  <p>→ {e.target} ({e.mode})</p>
                  <span className="font-mono text-[10px] text-[#a49778]">MATCH: CH {e.channel} / {e.type.toUpperCase()} {e.number}</span>
                </div>
              )}
            </div>
          ))}
          {!entries.length && <p className="text-xs text-[#a49778]">{t.editor.noEntries}</p>}
        </div>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="text-xs text-[#a49778]">
          {stats.supported} {t.library.supported} · {stats.unsupported} {t.library.unsupported} · {stats.unresolved} {t.library.unresolved} · {t.library.coverage} {stats.coverage}%
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button className="metal-button" onClick={handleSave}>{isEdit ? t.editor.saveChangesBtn : t.editor.saveMappingBtn}</button>
        <button className="mini-button" onClick={handleExport} disabled={!entries.length}>{t.editor.exportBtn}</button>
        <button className="mini-button" onClick={onClose}>{t.editor.cancelBtn}</button>
      </div>
    </div>
  );
}