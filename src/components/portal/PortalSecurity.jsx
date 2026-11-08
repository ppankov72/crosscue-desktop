import { useState, useEffect, useCallback } from 'react';
import { Mail, Shield, Crown, Rss, Info, Monitor, Clock, Activity, CheckCircle, XCircle, Smartphone, Laptop, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Phase F — Portal Security Center.
// Shows: account identity, DJ identity, account status, active entitlement,
// active sessions, registered devices, last activity, security events, MYFEED connection.
// No secrets, hashes, tokens, or private IDs are ever exposed.
export default function PortalSecurity({ data, t }) {
  const account = data?.account;
  const profile = data?.profile;
  const entitlement = data?.entitlement;
  const myfeed = data?.myfeed;
  const portalData = data;

  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getPortalSecurityData', {});
      setSecurityData(res.data);
    } catch {
      setSecurityData({ securityEvents: [], devices: [], sessions: [], activeSessionsCount: 0, activeDevicesCount: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSecurityData(); }, [fetchSecurityData]);

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
      await fetchSecurityData();
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
      await fetchSecurityData();
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
      await fetchSecurityData();
    } catch {
      showToast(t.security.revokeError, 'error');
    }
    setActionLoading(false);
  };

  if (!account) return <p className="text-stone-500">{t.common.loading}</p>;

  const statusColor = {
    active: 'text-green-600', pending: 'text-yellow-600',
    suspended: 'text-orange-600', blocked: 'text-red-600', deleted: 'text-stone-500'
  }[account.account_status] || 'text-stone-400';

  const events = securityData?.securityEvents || [];
  const devices = securityData?.devices || [];
  const sessions = securityData?.sessions || [];
  const activeSessions = sessions.filter(s => s.playback_active);
  const activeDevices = devices.filter(d => d.status === 'active');

  const eventLabel = (type) => ({
    login: t.security.eventLogin,
    logout: t.security.eventLogout,
    session_revoked: t.security.eventSessionRevoked,
    session_revoked_all: t.security.eventSessionRevokedAll,
    device_registered: t.security.eventDeviceRegistered,
    device_revoked: t.security.eventDeviceRevoked,
    profile_changed: t.security.eventProfileChanged,
    myfeed_linked: t.security.eventMyfeedLinked,
    myfeed_unlinked: t.security.eventMyfeedUnlinked,
    entitlement_changed: t.security.eventEntitlementChanged,
    role_changed: t.security.eventRoleChanged,
    security_setting_changed: t.security.eventSecuritySettingChanged,
  })[type] || type;

  const deviceIcon = (deviceType) => {
    const dt = (deviceType || '').toLowerCase();
    if (dt.includes('mobile') || dt.includes('phone')) return Smartphone;
    if (dt.includes('laptop')) return Laptop;
    return Monitor;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.security.title}</h2>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Account & DJ Identity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.security.accountIdentity}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-stone-400" />
              <span className="text-stone-700">{account.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-500" />
              <span className="text-stone-700">{account.role_display_long || account.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className={statusColor} />
              <span className={`capitalize ${statusColor}`}>{account.account_status}</span>
            </div>
            {account.playback_override && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t.security.playbackOverride}: Active
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.security.djIdentity}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-700">{profile?.display_name || '—'}</span>
            </div>
            {profile?.slug && (
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-stone-400" />
                <span className="text-stone-500">/{profile.slug}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-stone-500 capitalize">{profile?.visibility || 'private'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Entitlement & MYFEED */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.security.activeEntitlement}</h3>
          <div className="flex items-center gap-2 text-sm">
            {entitlement ? (
              <>
                <span className="text-lg font-bold capitalize text-stone-900">{entitlement.type}</span>
                <span className={`text-xs ${entitlement.status === 'active' ? 'text-green-600' : 'text-stone-500'}`}>
                  {entitlement.status}
                </span>
              </>
            ) : (
              <span className="text-stone-500">{t.license.noEntitlement}</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
            <Rss size={14} /> {t.security.myfeedConnection}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            {myfeed?.status === 'linked' ? (
              <>
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-stone-700">{t.myfeed.status.connected}</span>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-stone-400" />
                <span className="text-stone-500">{t.myfeed.status.notConnected}</span>
              </>
            )}
          </div>
          {myfeed?.linked_at && (
            <p className="mt-1 text-xs text-stone-400">{new Date(myfeed.linked_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
            <Clock size={14} /> {t.security.activeSessions}
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
        {loading ? (
          <p className="py-4 text-center text-sm text-stone-400">{t.common.loading}</p>
        ) : activeSessions.length > 0 ? (
          <div className="space-y-2">
            {activeSessions.map(s => {
              const DIcon = deviceIcon(s.device_type);
              return (
                <div key={s.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  s.is_current ? 'border border-amber-200 bg-amber-50' : 'bg-stone-50'
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{s.started ? new Date(s.started).toLocaleString() : '—'}</span>
                    {!s.is_current && (
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
          <p className="py-4 text-center text-sm text-stone-400">{t.security.noSessions}</p>
        )}
      </div>

      {/* Registered Devices */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
          <Monitor size={14} /> {t.security.registeredDevices}
          <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{activeDevices.length}</span>
        </h3>
        {loading ? (
          <p className="py-4 text-center text-sm text-stone-400">{t.common.loading}</p>
        ) : devices.length > 0 ? (
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

      {/* Security Events */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
          <Activity size={14} /> {t.security.securityEvents}
        </h3>
        {loading ? (
          <p className="py-4 text-center text-sm text-stone-400">{t.common.loading}</p>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="flex items-start justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${
                    e.event_type?.includes('revoked') || e.event_type?.includes('unlinked') ? 'bg-red-500' :
                    e.event_type?.includes('linked') || e.event_type?.includes('login') ? 'bg-green-500' :
                    'bg-stone-400'
                  }`} />
                  <div>
                    <p className="font-medium text-stone-800">{eventLabel(e.event_type)}</p>
                    {e.description && <p className="text-xs text-stone-500">{e.description}</p>}
                    <p className="mt-0.5 text-xs text-stone-400">{e.device_type || '—'} · {e.os || '—'} · {e.browser || '—'}</p>
                  </div>
                </div>
                <span className="text-xs text-stone-400">{e.created_date ? new Date(e.created_date).toLocaleString() : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-stone-400">{t.security.noEvents}</p>
        )}
      </div>

      {/* Password note */}
      <div className="flex items-start gap-2 rounded-lg bg-stone-100 px-4 py-3 text-xs text-stone-500">
        <Info size={14} className="mt-0.5 shrink-0" /> {t.security.password}
      </div>
    </div>
  );
}