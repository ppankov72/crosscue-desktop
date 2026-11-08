import { useState } from 'react';
import { X } from 'lucide-react';
import AudioSettings from '@/components/crosscue/settings/AudioSettings';
import AutoDJSettings from '@/components/crosscue/settings/AutoDJSettings';
import InterfaceSettings from '@/components/crosscue/settings/InterfaceSettings';
import MidiSettings from '@/components/crosscue/settings/MidiSettings';
import RecordingSettings from '@/components/crosscue/settings/RecordingSettings';
import DjProfileSettings from '@/components/crosscue/settings/DjProfileSettings';
import LicenseSettings from '@/components/crosscue/settings/LicenseSettings';
import { isTauriDesktop } from '@/lib/crosscue/freemium';

const allTabs = ['Account', 'DJ Profile', 'Privacy', 'License', 'Audio', 'Auto DJ', 'Interface', 'MIDI', 'Recording'];
const desktopTabs = ['DJ Profile', 'License', 'Audio', 'Auto DJ', 'Interface', 'MIDI', 'Recording'];

export default function SettingsDialog({ open, onClose, settings, onUpdate, onReset, onOutputChange, onFullscreen, permission, language }) {
  const tabs = isTauriDesktop() ? desktopTabs : allTabs;
  const [active, setActive] = useState(tabs[0]);

  if (!open) return null;

  const section =
    active === 'DJ Profile' ? <DjProfileSettings /> :
    active === 'License' ? <LicenseSettings /> :
    active === 'Audio' ? <AudioSettings settings={settings.audio} onUpdate={values => onUpdate('audio', values)} onOutputChange={onOutputChange} /> :
    active === 'Auto DJ' ? <AutoDJSettings settings={settings.autoDJ} onUpdate={values => onUpdate('autoDJ', values)} /> :
    active === 'Interface' ? <InterfaceSettings settings={settings.interface} onUpdate={values => onUpdate('interface', values)} onFullscreen={onFullscreen} /> :
    active === 'MIDI' ? <MidiSettings language={language} settings={settings.midi} onUpdate={values => onUpdate('midi', values)} /> :
    active === 'Recording' ? <RecordingSettings settings={settings.recording} onUpdate={values => onUpdate('recording', values)} /> :
    null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#242728] bg-[#171b1f] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#515a63] px-4 py-3">
          <b className="deck-label">CROSSCUE SETTINGS</b>
          <button className="mini-button" onClick={onClose}><X size={15} /> CLOSE</button>
        </header>
        <div className="flex flex-wrap gap-1 border-b border-[#515a63] px-2 py-2">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActive(tab)} className={`mini-button px-2 ${active === tab ? 'vinyl-active' : ''}`}>
              {tab === 'Auto DJ' ? 'AUTO' : tab === 'DJ Profile' ? 'PROFILE' : tab.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">{section}</div>
        <footer className="flex justify-between border-t border-[#515a63] p-3">
          <button className="mini-button" onClick={onReset}>RESET TO DEFAULTS</button>
          <button className="metal-button" onClick={onClose}>CLOSE</button>
        </footer>
      </aside>
    </div>
  );
}