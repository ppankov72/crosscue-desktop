import { useEffect, useState } from 'react';
import { X, RefreshCw, Ban, Unlock, RotateCcw, Plus, Square, AlertTriangle, Radio } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDuration, getRiskLevel } from '@/lib/crosscue/trialConfig';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-stone-100 text-stone-600',
  blocked: 'bg-red-100 text-red-700',
  paused: 'bg-amber-100 text-amber-700',
  shadow_blocked: 'bg-purple-100 text-purple-700'
};

const heartbeatColors = {
  ok: 'bg-green-500 text-white',
  delayed: 'bg-amber-500 text-white',
  lost: 'bg-red-500 text-white',
  none: 'bg-stone-300 text-white'
};

const decisionColors = {
  allow: 'bg-green-100 text-green-700',
  deny_trial_expired: 'bg-red-100 text-red-700',
  deny_heartbeat_lost: 'bg-orange-100 text-orange-700',
  deny_blocked: 'bg-red-100 text-red-700',
  suspicious_repeat_trial: 'bg-amber-100 text-amber-700'
};

function Section({ title, children }) {
  return (
    <div className="border-t border-stone-200 pt-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-900 text-right">{value || '—'}</span>
    </div>
  );
}

export default function TrialDetail({ trialId, onClose, onAction }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [extendSeconds, setExtendSeconds] = useState(3600);

  const fetchDetail = () => {
    base44.functions.invoke('getTrialDetail', { trialId })
      .then(res => { setDetail(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [trialId]);

  // Poll for live heartbeat if there's an active session
  useEffect(() => {
    if (!detail?.activeSession) return;
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [detail?.activeSession?.id]);

  const doAction = async (action, params = {}) => {
    setActionLoading(action);
    try {
      await base44.functions.invoke('adminTrialAction', { action, trialId, ...params });
      fetchDetail();
      onAction();
    } catch {}
    setActionLoading(null);
  };

  const t = detail?.trial;
  const inst = detail?.installation;
  const sess = detail?.activeSession;
  const shadow = detail?.shadowDecision;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-stone-900">Trial Detail</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : !detail ? (
          <div className="py-20 text-center text-stone-400">Not found</div>
        ) : (
          <div className="space-y-4 px-6 py-4">
            {/* SHADOW MODE badge */}
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              SHADOW MODE ACTIVE — Playback is not blocked
            </div>

            {/* Admin Actions */}
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Admin Actions</h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <input type="number" value={extendSeconds} onChange={e => setExtendSeconds(Number(e.target.value))} step="900" className="w-24 rounded border border-stone-200 px-2 py-1.5 text-sm" />
                  <button disabled={actionLoading === 'extend'} onClick={() => doAction('extend', { extendSeconds })} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                    <Plus size={12} /> Extend ({Math.round(extendSeconds / 60)}m)
                  </button>
                </div>
                <button disabled={actionLoading === 'reset'} onClick={() => doAction('reset')} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                  <RotateCcw size={12} /> Reset
                </button>
                {t?.status === 'blocked' ? (
                  <button disabled={actionLoading === 'unblock'} onClick={() => doAction('unblock')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                    <Unlock size={12} /> Unblock
                  </button>
                ) : (
                  <button disabled={actionLoading === 'block'} onClick={() => doAction('block', { reason: 'manual_admin' })} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                    <Ban size={12} /> Block
                  </button>
                )}
                <button disabled={actionLoading === 'terminate' || !sess} onClick={() => doAction('terminate')} className="inline-flex items-center gap-1 rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50">
                  <Square size={12} /> Terminate Session
                </button>
              </div>
            </div>

            {/* DJ PROFILE (anonymous trial) */}
            {detail?.trialProfile && (
              <Section title="DJ Profile">
                <div className="flex items-center gap-3 pb-2">
                  {detail.trialProfile.avatarUrl ? (
                    <img src={detail.trialProfile.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-500">
                      {(detail.trialProfile.djNickname || '?').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-stone-900">{detail.trialProfile.djNickname}</div>
                    <div className="text-xs text-stone-500">{detail.trialProfile.email}</div>
                  </div>
                </div>
                <Row label="Welcome Email" value={detail.trialProfile.welcomeEmailSent ? `Sent ${detail.trialProfile.welcomeEmailSentAt ? new Date(detail.trialProfile.welcomeEmailSentAt).toLocaleString() : ''}` : 'Not sent'} />
              </Section>
            )}

            {/* GENERAL */}
            <Section title="General">
              <Row label="Trial ID" value={t?.id} />
              <Row label="User ID" value={t?.userId} />
              <Row label="Email" value={t?.email} />
              <Row label="DJ Nickname" value={detail?.trialProfile?.djNickname} />
              <Row label="Status" value={<span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusColors[t?.status] || 'bg-stone-100'}`}>{t?.status?.toUpperCase()}</span>} />
              <Row label="Created" value={t?.createdAt ? new Date(t.createdAt).toLocaleString() : ''} />
              <Row label="Activated" value={t?.activatedAt ? new Date(t.activatedAt).toLocaleString() : ''} />
              <Row label="Expired" value={t?.expiredAt ? new Date(t.expiredAt).toLocaleString() : ''} />
            </Section>

            {/* USAGE */}
            <Section title="Usage">
              <Row label="Trial Limit" value={formatDuration(t?.limitSeconds)} />
              <Row label="Playback Used" value={formatDuration(t?.usedSeconds)} />
              <Row label="Remaining" value={formatDuration(t?.remainingSeconds)} />
              <Row label="Percentage Used" value={`${t?.percentageUsed || 0}%`} />
              <Row label="Active Session" value={sess ? 'Yes' : 'No'} />
            </Section>

            {/* SESSION */}
            <Section title="Current Session">
              {sess ? (
                <>
                  <Row label="Session ID" value={sess.id} />
                  <Row label="Started" value={new Date(sess.startedAt).toLocaleString()} />
                  <Row label="Last Heartbeat" value={new Date(sess.lastHeartbeatAt).toLocaleString()} />
                  <Row label="Session Playback" value={formatDuration(sess.accumulatedSeconds)} />
                  <Row label="Heartbeat Status" value={
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${heartbeatColors[sess.heartbeatStatus]}`}>
                      {sess.heartbeatStatus?.toUpperCase()}
                    </span>
                  } />
                  <Row label="IP" value={sess.ip} />
                  <Row label="Location" value={[sess.city, sess.country].filter(Boolean).join(', ')} />
                  <Row label="Page" value={sess.page} />
                </>
              ) : (
                <p className="text-sm text-stone-400">No active session</p>
              )}
            </Section>

            {/* INSTALLATION */}
            <Section title="Installation">
              {inst ? (
                <>
                  <Row label="Installation ID" value={inst.installationId} />
                  <Row label="First Seen" value={inst.firstSeenAt ? new Date(inst.firstSeenAt).toLocaleString() : ''} />
                  <Row label="Last Seen" value={inst.lastSeenAt ? new Date(inst.lastSeenAt).toLocaleString() : ''} />
                  <Row label="Browser" value={inst.browser} />
                  <Row label="OS" value={inst.os} />
                  <Row label="Device" value={inst.device} />
                  <Row label="Screen Class" value={inst.screenClass} />
                  <Row label="Timezone" value={inst.timezone} />
                  <Row label="Language" value={inst.language} />
                  <Row label="Env Hash" value={inst.environmentHash} />
                  <Row label="Trial History" value={inst.trialHistoryCount} />
                  <Row label="Flagged" value={inst.flagged ? 'Yes' : 'No'} />
                </>
              ) : (
                <p className="text-sm text-stone-400">No installation record</p>
              )}
            </Section>

            {/* NETWORK */}
            <Section title="Network">
              {inst ? (
                <>
                  <Row label="First IP" value={inst.firstIp} />
                  <Row label="Last IP" value={inst.lastIp} />
                  <Row label="First Country" value={inst.firstCountry} />
                  <Row label="Last Country" value={inst.lastCountry} />
                </>
              ) : (
                <p className="text-sm text-stone-400">No network data</p>
              )}
            </Section>

            {/* RISK */}
            <Section title="Risk">
              <Row label="Risk Score" value={t?.riskScore} />
              <Row label="Risk Level" value={<span className={`font-bold ${t?.riskScore > 80 ? 'text-red-600' : t?.riskScore > 60 ? 'text-orange-600' : t?.riskScore > 30 ? 'text-amber-600' : 'text-green-600'}`}>{getRiskLevel(t?.riskScore || 0).toUpperCase()}</span>} />
              <Row label="Triggered Signals" value={t?.riskSignals?.join(', ') || 'None'} />
              <Row label="Repeat Trial Attempts" value={inst?.trialHistoryCount} />
              <Row label="Environment Matches" value={detail?.envMatchCount} />
            </Section>

            {/* FEEDBACK */}
            {detail?.trialProfile?.feedbackScore && (
              <Section title="Feedback">
                <Row label="Score" value={`${detail.trialProfile.feedbackScore} / 10`} />
                <Row label="Would use again" value={(detail.trialProfile.feedbackUseAgain || '').toUpperCase()} />
                <Row label="Submitted" value={detail.trialProfile.feedbackSubmittedAt ? new Date(detail.trialProfile.feedbackSubmittedAt).toLocaleString() : ''} />
                {detail.trialProfile.feedbackComment && (
                  <div className="mt-2 rounded border border-stone-200 bg-stone-50 p-2 text-sm text-stone-700">{detail.trialProfile.feedbackComment}</div>
                )}
              </Section>
            )}

            {/* SHADOW ENFORCEMENT */}
            <Section title="Shadow Enforcement">
              <Row label="Current Decision" value={
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${decisionColors[shadow?.decision] || 'bg-stone-100'}`}>
                  {shadow?.decision?.toUpperCase()}
                </span>
              } />
              <Row label="Reason" value={shadow?.reason} />
              <Row label="Would block in Phase 2?" value={shadow?.decision === 'allow' ? 'No' : 'Yes'} />
            </Section>

            {/* Recent Sessions */}
            <Section title="Recent Sessions">
              <div className="space-y-1">
                {detail?.sessions?.slice(0, 10).map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded border border-stone-100 px-2 py-1.5 text-xs">
                    <span className="text-stone-500">{new Date(s.startedAt).toLocaleString()}</span>
                    <span className="font-mono text-stone-600">{formatDuration(s.accumulatedSeconds)}</span>
                    <span className={`rounded px-1.5 py-0.5 ${s.endReason === 'heartbeat_lost' ? 'bg-red-100 text-red-700' : s.playbackActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                      {s.endReason || (s.playbackActive ? 'ACTIVE' : 'STOPPED')}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}