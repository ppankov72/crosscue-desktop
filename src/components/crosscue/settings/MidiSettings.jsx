import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import MappingManager from '@/components/midi/MappingManager';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';
import { midiManager } from '@/lib/midi/MidiManager';
import { useMidiState } from '@/lib/midi/useMidiState';

export default function MidiSettings({ settings, onUpdate, language }) {
  const { t, lang } = useMidiTranslations(language);
  const { devices, status } = useMidiState();
  const [mappingManagerOpen, setMappingManagerOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const available = typeof navigator !== 'undefined' && Boolean(navigator.requestMIDIAccess);
  const isConnected = status === 'ready' || status === 'active';

  const handleConnect = async () => {
    setConnecting(true);
    onUpdate({ enabled: true });
    await midiManager.enable();
    setConnecting(false);
  };

  const handleToggle = async (e) => {
    const checked = e.target.checked;
    onUpdate({ enabled: checked });
    if (checked && !isConnected) {
      setConnecting(true);
      await midiManager.enable();
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="deck-label">{t.settings.title}</h2>
      {!available ? (
        <p className="text-xs text-[#a49778]">{t.settings.unavailable}</p>
      ) : (
        <>
          <label className="flex items-center justify-between text-xs">
            <span>{t.settings.enableMidi}</span>
            <input
              className="accent-[#bb8d36]"
              type="checkbox"
              checked={settings.enabled}
              onChange={handleToggle}
            />
          </label>

          {!isConnected && (
            <div className="rounded border border-amber-600/50 bg-[#20252b] p-3 text-xs space-y-2">
              <p className="text-stone-300">
                {status === 'denied' ? t.panel.statusDenied : 'MIDI is currently disconnected.'}
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="metal-button w-full text-amber-300 border-amber-500/70 hover:bg-amber-950/40"
              >
                <SlidersHorizontal size={13} /> {connecting ? 'CONNECTING...' : 'CONNECT MIDI CONTROLLER'}
              </button>
            </div>
          )}

          <label className="block text-xs">
            {t.settings.defaultDevice}
            <select
              disabled={!settings.enabled || !isConnected}
              className="source-input mt-1 block w-full"
              value={settings.deviceId}
              onChange={e => onUpdate({ deviceId: e.target.value })}
            >
              <option value="default">{t.settings.systemDefault}</option>
              {devices.map(device => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </select>
          </label>
          <button className="metal-button w-full" onClick={() => setMappingManagerOpen(true)}>
            {t.settings.openMappingManager}
          </button>
          <p className="text-xs text-[#a49778]">
            {t.settings.description}
          </p>
        </>
      )}
      <MappingManager language={lang} open={mappingManagerOpen} onClose={() => setMappingManagerOpen(false)} />
    </div>
  );
}