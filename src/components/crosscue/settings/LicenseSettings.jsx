import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function LicenseSettings() {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    invoke('get_license_status')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const handleActivate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const ok = await invoke('activate_license', { key: key.trim() });
      if (ok) {
        setMessage('License activated successfully.');
        const updated = await invoke('get_license_status');
        setStatus(updated);
        setKey('');
      }
    } catch (err) {
      setMessage(err?.toString() || 'Activation failed.');
    }
    setLoading(false);
  };

  const isActivated = status?.is_activated;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold tracking-wider text-stone-500">STATUS</div>
        <div className="mt-1 text-sm text-stone-200">
          {isActivated ? 'Activated' : 'Trial / Not activated'}
        </div>
        {status?.first_run && (
          <div className="mt-1 text-xs text-stone-500">
            First run: {new Date(status.first_run).toLocaleDateString()}
          </div>
        )}
      </div>

      {!isActivated && (
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wider text-stone-500">
            LICENSE KEY
          </label>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="CROSSCUE-XXXX-XXXX-XXXX"
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600"
          />
          <button
            onClick={handleActivate}
            disabled={loading || !key.trim()}
            className="metal-button mt-2 w-full"
          >
            {loading ? 'ACTIVATING…' : 'ACTIVATE'}
          </button>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}