import { useState, useEffect } from 'react';
import { X, Monitor } from 'lucide-react';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import { midiManager } from '@/lib/midi/MidiManager';
import { useMidiState } from '@/lib/midi/useMidiState';
import MappingLibrary from './MappingLibrary';
import ImportMapping from './ImportMapping';
import ManualMappingEditor from './ManualMappingEditor';
import AutoMappingWizard from './AutoMappingWizard';
import MidiMonitor from './MidiMonitor';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

// Controller Mapping Manager — accessible from the MIDI panel and MIDI settings.
// Provides: Library (Official/Community/My), Import (TSI), Create/Edit (MIDI Learn).
export default function MappingManager({ open, onClose, defaultTab = 'library', language }) {
  const { t } = useMidiTranslations(language);
  const [tab, setTab] = useState(defaultTab);
  const [showMonitor, setShowMonitor] = useState(false);
  const [library, setLibrary] = useState(mappingLibraryStore.library);
  const [editingProfile, setEditingProfile] = useState(null);
  const { devices, status, lastMessage } = useMidiState();

  useEffect(() => mappingLibraryStore.subscribe(setLibrary), []);

  useEffect(() => {
    if (open && defaultTab) setTab(defaultTab);
  }, [open, defaultTab]);

  // MIDI access is not requested automatically upon opening.
  // It uses existing connection or explicit user connect action.

  if (!open) return null;

  const activeProfile = library.activeProfileId
    ? [...library.official, ...library.community, ...library.my].find(p => p.id === library.activeProfileId)
    : null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60">
      <div className="absolute inset-2 sm:inset-4 flex flex-col bg-[#171b1f] border border-[#515a63] shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#515a63] px-4 py-3">
          <b className="deck-label">{t.manager.title}</b>
          <div className="flex items-center gap-2">
            <a
              href="/midi-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="mini-button text-amber-400 border-amber-600/60 hover:bg-amber-950/40"
              title={t.manager.guideTooltip}
            >
              {t.manager.guideBtn}
            </a>
            <button className={`mini-button ${showMonitor ? 'vinyl-active' : ''}`} onClick={() => setShowMonitor(s => !s)}>
              <Monitor size={12} /> {t.manager.monitorBtn}
            </button>
            <button className="mini-button" onClick={onClose}><X size={14} /> {t.manager.closeBtn}</button>
          </div>
        </header>

        {/* Device bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#515a63] px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#a49778]">{t.manager.devicesLabel} </span>
            {devices.length
              ? devices.map(d => <span key={d.id} className="mr-3 text-[#eee1c6]">● {d.name}</span>)
              : <span className="text-[#a49778]">{t.manager.noDevicesDetected}</span>}
            {activeProfile && <span className="text-[#d5ad58]">{t.manager.activeProfile(activeProfile.metadata.name)}</span>}
            {status !== 'ready' && status !== 'active' && (
              <button
                type="button"
                onClick={() => midiManager.enable()}
                className="mini-button text-amber-300 border-amber-500/70 hover:bg-amber-950/40 ml-1"
                title="Connect MIDI Controller"
              >
                CONNECT MIDI
              </button>
            )}
          </div>
          {devices.length > 0 && tab !== 'auto' && (
            <button
              onClick={() => setTab('auto')}
              className="mini-button text-amber-300 border-amber-600/70 hover:bg-amber-950/40"
              title={t.manager.autoDetectActionTooltip}
            >
              {t.manager.autoDetectAction}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-[#515a63] px-2 py-2">
          {[
            { id: 'library', label: t.manager.tabLibrary },
            { id: 'auto', label: t.manager.tabAutoDetect },
            { id: 'import', label: t.manager.tabImport },
            { id: 'create', label: t.manager.tabCreateEdit },
          ].map(({ id: tabId, label }) => (
            <button
              key={tabId}
              className={`mini-button px-3 ${tab === tabId ? 'vinyl-active text-amber-200' : ''}`}
              onClick={() => { setTab(tabId); setEditingProfile(null); }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'library' && (
            <MappingLibrary
              language={language}
              library={library}
              devices={devices}
              onEdit={p => { setEditingProfile(p); setTab('create'); }}
            />
          )}
          {tab === 'auto' && (
            <AutoMappingWizard
              language={language}
              devices={devices}
              lastMessage={lastMessage}
              onFinish={() => setTab('library')}
            />
          )}
          {tab === 'import' && (
            <ImportMapping language={language} onSave={() => { setTab('library'); setEditingProfile(null); }} />
          )}
          {tab === 'create' && (
            <ManualMappingEditor
              language={language}
              profile={editingProfile}
              devices={devices}
              lastMessage={lastMessage}
              onClose={() => { setEditingProfile(null); setTab('library'); }}
            />
          )}
        </div>

        {/* MIDI Monitor */}
        {showMonitor && <MidiMonitor language={language} lastMessage={lastMessage} library={library} />}
      </div>
    </div>
  );
}