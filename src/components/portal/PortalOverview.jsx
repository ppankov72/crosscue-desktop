import { CreditCard, PlayCircle, Clock, Rss, Globe, EyeOff, Link2, Activity, ShoppingBag } from 'lucide-react';
import DjAvatar from '@/components/crosscue/DjAvatar';

// Portal Overview — quick status of account, identity, license, MYFEED.
export default function PortalOverview({ data, t, onNavigate }) {
  if (!data) return <p className="text-stone-500">{t.common.loading}</p>;

  const { profile, account, entitlement, trial, myfeed, recentSessions, ordersCount, devicesCount } = data;

  const licenseType = entitlement?.type || 'none';
  const licenseStatus = entitlement?.status || 'none';
  const playbackAllowed = Boolean(account?.playback_override) || licenseStatus === 'active';

  const myfeedStatus = myfeed?.status || 'not_connected';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.overview.title}</h2>

      {/* Identity + License row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* DJ Identity */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.overview.identity}</h3>
          <div className="flex items-center gap-3">
            <DjAvatar type={profile?.avatar_type} seed={profile?.avatar_seed || profile?.id} url={profile?.avatar_url} size={48} />
            <div className="min-w-0">
              <p className="truncate font-bold text-stone-900">{profile?.display_name || '—'}</p>
              <p className="text-sm text-stone-500">{account?.role_display || account?.role}</p>
            </div>
          </div>
          <button onClick={() => onNavigate('profile')} className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800">
            {t.profile.edit} →
          </button>
        </div>

        {/* License */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.overview.license}</h3>
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-amber-600" />
            <span className="text-lg font-bold capitalize text-stone-900">{licenseType !== 'none' ? licenseType : t.license.noEntitlement}</span>
          </div>
          <p className={`mt-1 text-sm ${licenseStatus === 'active' ? 'text-green-600' : 'text-stone-500'}`}>
            {licenseStatus === 'active' ? t.license.active : licenseStatus === 'expired' ? t.license.expired : licenseStatus}
          </p>
          {entitlement?.type === 'trial' && trial && (
            <p className="mt-1 text-sm text-stone-500">{t.overview.trialRemaining}: {Math.floor(trial.playback_remaining_seconds / 60)}m</p>
          )}
          {entitlement?.type === 'premium' && entitlement.expires_at && (
            <p className="mt-1 text-sm text-stone-500">{t.overview.premiumExpiry}: {new Date(entitlement.expires_at).toLocaleDateString()}</p>
          )}
          {entitlement?.type === 'weekend' && entitlement.expires_at && (
            <p className="mt-1 text-sm text-stone-500">{t.overview.weekendExpiry}: {new Date(entitlement.expires_at).toLocaleDateString()}</p>
          )}
          <button onClick={() => onNavigate('license')} className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800">
            {t.license.title} →
          </button>
        </div>
      </div>

      {/* Status row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Playback Access */}
        <StatusCard icon={PlayCircle} label={t.overview.playback} value={playbackAllowed ? t.overview.allowed : t.overview.locked} valueColor={playbackAllowed ? 'text-green-600' : 'text-red-600'} />
        {/* MYFEED */}
        <StatusCard icon={Rss} label={t.overview.myfeedStatus} value={myfeedStatus === 'linked' ? t.myfeed.status.connected : myfeedStatus === 'pending' ? t.myfeed.status.pending : myfeedStatus === 'error' ? t.myfeed.status.error : t.myfeed.status.notConnected} valueColor={myfeedStatus === 'linked' ? 'text-green-600' : myfeedStatus === 'error' ? 'text-red-600' : 'text-stone-500'} onClick={() => onNavigate('myfeed')} />
        {/* Profile */}
        <StatusCard icon={profile?.visibility === 'public' ? Globe : profile?.visibility === 'unlisted' ? Link2 : EyeOff} label={t.overview.profileStatus} value={profile?.visibility ? t.overview[profile.visibility] : t.overview.private} valueColor="text-stone-700" onClick={() => onNavigate('profile')} />
        {/* Orders */}
        <StatusCard icon={ShoppingBag} label={t.nav.orders} value={String(ordersCount || 0)} valueColor="text-stone-700" onClick={() => onNavigate('orders')} />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
          <Activity size={14} /> {t.overview.recentActivity}
        </h3>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{s.device_type || 'Unknown'} · {s.os || '—'} · {s.browser || ''}</span>
                <span className="text-stone-400">{s.started ? new Date(s.started).toLocaleDateString() : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">{t.overview.noActivity}</p>
        )}
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, valueColor, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-stone-200 bg-white p-4 text-left hover:border-amber-300 hover:shadow-sm">
      <div className="flex items-center gap-2 text-stone-400">
        <Icon size={16} />
        <span className="text-xs font-bold tracking-wider">{label}</span>
      </div>
      <p className={`mt-2 font-bold ${valueColor}`}>{value}</p>
    </button>
  );
}