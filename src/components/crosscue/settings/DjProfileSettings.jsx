import { useState } from 'react';
import { useCrossCueSettings } from '@/lib/crosscue/settings';

export default function DjProfileSettings() {
  const { settings, update } = useCrossCueSettings();
  const [name, setName] = useState(settings.interface.djName || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    update('interface', { djName: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold tracking-wider text-stone-500">DJ NAME</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          placeholder="Your DJ name"
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600"
        />
        <p className="mt-1 text-xs text-stone-500">Shown on the mixer and in recordings.</p>
      </div>

      <button onClick={handleSave} className="metal-button w-full">
        {saved ? 'SAVED' : 'SAVE'}
      </button>
    </div>
  );
}