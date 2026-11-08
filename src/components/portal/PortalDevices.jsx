import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Monitor, Clock, Smartphone, Laptop } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Phase F — Portal Devices & Sessions with revoke capabilities.
// Shows current device indicator, device status, and session revoke buttons.
// Safe projection: no environment hash, risk score, raw fingerprint, or full IP.
export default function PortalDevices({ t }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getPortalSecurityData', {});
      setData(res.data);
    } catch {
      setData({ devices: [], sessions: [], securityEvents: [], activeSessionsCount: 0, activeDevicesCount: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm(t.security.confirmRevokeSession)) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('revokeSession', { session_id: sessionId });
      showToast(t.security.revokeSuccess, 'success');
      await fetchDevices();
    } catch {
      showToast(t.security.revokeError, 'error');
    }
    setActionLoading(false);
  };

  const handleRevokeAllOther = async () => {
    if (!window.confirm(t.security.confirmRevokeAll)) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('revokeAllOtherSessions', {});
      showToast(t.security.revokeSuccess, 'success');
      await fetchDevices();
    } catch {
      showToast(t.security.revokeError, 'error');
    }
    setActionLoading(false);
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm(t.security.confirmRevokeDevice)) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('revokeDevice', { device_id: deviceId });
      showToast(t.security.revokeSuccess, 'success');
      await fetchDevices();
    } catch {
      showToast(t.security.revokeError, 'error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  const devices = data?.devices || [];
  const sessions = data?.sessions || [];
  const activeSessions = sessions.filter(s => s.playback_active);

  const deviceIcon = (deviceType) => {
    const dt = (deviceType || '').toLowerCase();
    if (dt.includes('mobile') || dt.includes('phone')) return Smartphone;
    if (dt.includes('laptop')) return Laptop;
    return Monitor;
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">{t.devices.title}</h2>
        <button onClick={fetchDevices} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100">
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="text-sm text-stone-500">{t.devices.subtitle}</p>

      {/* Devices */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
          <Monitor size={14} /> {t.security.registeredDevices}
          <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{devices.filter(d => d.status === 'active').length}</span>
        </h3>
        {devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map(d => {
              const DIcon = deviceIcon(d.device_type);
              return (
                <div key={d.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  d.is_current ? 'border border-amber-200 bg-amber-50' : d.status === 'revoked' ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <DIcon size={16} className="text-stone-400" />
                    <div>
                      <span className="font-medium text-stone-800">{d.device_type}</span>
                      <span className="ml-2 text-stone-500">{d.os_family} · {d.browser_family}</span>
                      {d.is_current && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
                          {t.security.currentDevice}
                        </span>
                      )}
                      {d.status === 'revoked' && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                          {t.security.revoked}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-stone-400">
                      <p>{t.devices.firstSeen}: {d.first_seen ? new Date(d.first_seen).toLocaleDateString() : '—'}</p>
                      <p>{t.devices.lastSeen}: {d.last_seen ? new Date(d.last_seen).toLocaleDateString() : '—'}</p>
                    </div>
                    {!d.is_current && d.status === 'active' && (
                      <button
                        onClick={() => handleRevokeDevice(d.id)}
                        disabled={actionLoading}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t.security.revokeDevice}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-stone-400">{t.security.noDevices}</p>
        )}
      </div>

      {/* Sessions */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
            <Clock size={14} /> {t.devices.sessions}
            <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{activeSessions.length}</span>
          </h3>
          {activeSessions.length > 1 && (
            <button
              onClick={handleRevokeAllOther}
              disabled={actionLoading}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {t.security.revokeAllOther}
            </button>
          )}
        </div>
        {sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.slice(0, 15).map(s => {
              const DIcon = deviceIcon(s.device_type);
              return (
                <div key={s.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  s.is_current ? 'border border-amber-200 bg-amber-50' : s.playback_active ? 'bg-stone-50' : 'bg-stone-50 opacity-60'
                }`}>
                  <div className="flex items-center gap-2">
                    <DIcon size={16} className="text-stone-400" />
                    <div>
                      <span className="font-medium text-stone-800">{s.device_type || 'Unknown'}</span>
                      <span className="ml-2 text-stone-500">{s.os || '—'} · {s.browser || '—'}</span>
                      {s.is_current && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
                          {t.security.currentSession}
                        </span>
                      )}
                      {s.playback_active && !s.is_current && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">●</span>
                      )}
                      {s.end_reason === 'revoked' && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                          {t.security.revoked}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{s.started ? new Date(s.started).toLocaleString() : '—'}</span>
                    {s.playback_active && !s.is_current && (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={actionLoading}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t.security.revokeSession}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-stone-400">{t.devices.noSessions}</p>
        )}
      </div>

      <div className="rounded-lg bg-stone-100 px-4 py-3 text-xs text-stone-500">
        {t.devices.note}
      </div>
    </div>
  );
}