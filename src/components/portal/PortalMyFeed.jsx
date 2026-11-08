import { useState } from 'react';
import { Loader2, Link2, Unlink, Rss, Share2, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PortalCommunity from '@/components/portal/PortalCommunity';

// Portal MYFEED — connection, profile, community, activity sharing.
// MYFEED failure does NOT affect playback or licensing.
export default function PortalMyFeed({ data, t, onRefresh }) {
  const myfeed = data?.myfeed;
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(myfeed?.share_activity_enabled || false);
  const [publishing, setPublishing] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isConnected = myfeed?.status === 'linked';

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('initiateMyFeedLink', {});
      if (res.data?.confirm_url) {
        window.open(res.data.confirm_url, '_blank', 'noopener,noreferrer');
        setPendingConfirm(true); // show "I've confirmed" button
      } else if (res.data?.error === 'already_linked') {
        setError('already_linked');
      } else {
        setError(res.data?.error || 'linking_failed');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'linking_failed');
    }
    setConnecting(false);
  };

  const handleVerifyLink = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('confirmMyFeedLink', {});
      if (res.data?.ok) {
        setPendingConfirm(false);
        await onRefresh();
      } else if (res.data?.error === 'not_confirmed_yet') {
        setError('not_confirmed_yet');
      } else {
        setError(res.data?.error || 'verify_failed');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'verify_failed');
    }
    setVerifying(false);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await base44.functions.invoke('unlinkMyFeed', {});
      await onRefresh();
      setShowDisconnect(false);
    } catch {}
    setDisconnecting(false);
  };

  const toggleShare = async (enabled) => {
    setShareEnabled(enabled);
    try {
      await base44.functions.invoke('updateMyFeedSettings', { share_activity_enabled: enabled });
    } catch {
      setShareEnabled(!enabled);
    }
  };

  const handlePublish = async (activityType, content) => {
    setPublishing(activityType);
    setPublishResult(null);
    try {
      const idempotencyKey = `${data?.account?.id}-${activityType}-${Date.now()}`;
      const res = await base44.functions.invoke('publishToMyFeed', { activity_type: activityType, content, idempotency_key: idempotencyKey });
      if (res.data?.ok) {
        setPublishResult({ type: activityType, ok: true });
      } else {
        setPublishResult({ type: activityType, ok: false, error: res.data?.error });
      }
    } catch (e) {
      setPublishResult({ type: activityType, ok: false, error: e.response?.data?.error });
    }
    setPublishing(null);
    setTimeout(() => setPublishResult(null), 3000);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.myfeed.title}</h2>
      <p className="text-sm text-stone-500">{t.myfeed.subtitle}</p>

      {/* Connection Status */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isConnected ? 'bg-green-100' : 'bg-stone-100'}`}>
              <Rss size={20} className={isConnected ? 'text-green-600' : 'text-stone-400'} />
            </div>
            <div>
              <p className="font-bold text-stone-900">{isConnected ? t.myfeed.status.connected : t.myfeed.status.notConnected}</p>
              {isConnected && myfeed?.myfeed_display_name && <p className="text-sm text-stone-500">{myfeed.myfeed_display_name}</p>}
            </div>
          </div>
          {isConnected ? (
            <button onClick={() => setShowDisconnect(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              <Unlink size={14} /> {t.myfeed.disconnect}
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700">
              {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {t.myfeed.connect}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} /> {error === 'not_confirmed_yet' ? 'Please confirm the link on MYFEED first, then click the button below.' : t.myfeed.linkingError}
          </div>
        )}

        {pendingConfirm && !isConnected && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-stone-700">A confirmation page opened in a new tab. After confirming on MYFEED, click below to verify the link.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={handleVerifyLink} disabled={verifying} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Verify Link
              </button>
              <button onClick={() => setPendingConfirm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.common.cancel}</button>
            </div>
          </div>
        )}

        {showDisconnect && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-stone-700">{t.myfeed.confirmDisconnect}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setShowDisconnect(false)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.common.cancel}</button>
              <button onClick={handleDisconnect} disabled={disconnecting} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700">
                {disconnecting ? <Loader2 size={14} className="animate-spin" /> : null} {t.myfeed.disconnect}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MYFEED Profile (if connected) */}
      {isConnected && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.myfeed.profile}</h3>
          <div className="flex items-center gap-3">
            {myfeed?.myfeed_avatar_url ? (
              <img src={myfeed.myfeed_avatar_url} alt="" className="h-12 w-12 rounded-full" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                {(myfeed?.myfeed_display_name || '?')[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-stone-900">{myfeed?.myfeed_display_name || 'MYFEED User'}</p>
              {myfeed?.myfeed_profile_url && (
                <a href={myfeed.myfeed_profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800">
                  {t.myfeed.openInMyFeed} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Sharing */}
      {isConnected && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.myfeed.shareActivity}</h3>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={shareEnabled} onChange={e => toggleShare(e.target.checked)} className="h-4 w-4 accent-amber-600" />
            {t.myfeed.shareActivitySetting}
          </label>
          <p className="mt-1 text-xs text-stone-500">{t.myfeed.shareActivityDesc}</p>

          {shareEnabled && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ShareButton icon={Share2} label={t.myfeed.shareProfile} loading={publishing === 'dj_profile_updated'} result={publishResult} type="dj_profile_updated" onClick={() => handlePublish('dj_profile_updated', `Check out my DJ profile: ${data?.profile?.display_name}`)} t={t} />
              <ShareButton icon={Share2} label={t.myfeed.shareMix} loading={publishing === 'mix_shared'} result={publishResult} type="mix_shared" onClick={() => handlePublish('mix_shared', 'Sharing a new mix!')} t={t} />
              <ShareButton icon={Share2} label={t.myfeed.sharePlaylist} loading={publishing === 'playlist_shared'} result={publishResult} type="playlist_shared" onClick={() => handlePublish('playlist_shared', 'Sharing a playlist')} t={t} />
              <ShareButton icon={Share2} label={t.myfeed.shareAchievement} loading={publishing === 'achievement_unlocked'} result={publishResult} type="achievement_unlocked" onClick={() => handlePublish('achievement_unlocked', 'New achievement unlocked!')} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Community Feed */}
      <PortalCommunity t={t} isConnected={isConnected} />
    </div>
  );
}

function ShareButton({ icon: Icon, label, loading, result, type, onClick, t }) {
  const r = result?.type === type ? result : null;
  return (
    <button onClick={onClick} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
      {loading ? <Loader2 size={14} className="animate-spin" /> : r?.ok ? <CheckCircle size={14} className="text-green-600" /> : r && !r.ok ? <AlertCircle size={14} className="text-red-600" /> : <Icon size={14} />}
      {label}
    </button>
  );
}