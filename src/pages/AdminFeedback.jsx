// Phase G.1 — Admin Product Feedback management page.
// Bug reports + feature requests with search, filter, status management, and overview counts.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw, Loader2, AlertCircle, Bug, Lightbulb, ThumbsUp, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BUG_STATUSES = ['new', 'confirmed', 'in_progress', 'resolved', 'closed', 'rejected'];
const FEATURE_STATUSES = ['submitted', 'under_review', 'planned', 'in_progress', 'released', 'declined'];

export default function AdminFeedback() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('bugs');
  const [bugFilter, setBugFilter] = useState({ status: '', search: '' });
  const [featureFilter, setFeatureFilter] = useState({ status: '', search: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [trialFeedback, setTrialFeedback] = useState(null);
  const [trialFeedbackLoading, setTrialFeedbackLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('adminGetFeedback', {
      bug_status: bugFilter.status || undefined,
      bug_search: bugFilter.search || undefined,
      feature_status: featureFilter.status || undefined,
      feature_search: featureFilter.search || undefined,
    })
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [bugFilter, featureFilter]);

  const fetchTrialFeedback = () => {
    setTrialFeedbackLoading(true);
    base44.functions.invoke('adminGetTrialFeedback', {})
      .then(res => { setTrialFeedback(res.data); })
      .catch(() => {})
      .finally(() => setTrialFeedbackLoading(false));
  };

  useEffect(() => { if (tab === 'trial' && !trialFeedback) fetchTrialFeedback(); }, [tab]);

  const openEdit = (item, type) => {
    setEditing({ ...item, type });
    setEditForm({
      status: item.status,
      notes: type === 'bug' ? item.admin_notes || '' : item.admin_response || ''
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fn = editing.type === 'bug' ? 'adminUpdateBugReport' : 'adminUpdateFeatureRequest';
      const payload = editing.type === 'bug'
        ? { bug_id: editing.id, status: editForm.status, admin_notes: editForm.notes }
        : { feature_id: editing.id, status: editForm.status, admin_response: editForm.notes };
      await base44.functions.invoke(fn, payload);
      setEditing(null);
      fetchData();
    } catch { setError('save_failed'); }
    setSaving(false);
  };

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <Shield className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access denied</p>
        <Link to="/admin" className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800"><ArrowLeft size={16} /> Back to Admin</Link>
      </div>
    );
  }

  const overview = data?.overview || {};

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">Product Feedback</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-4 border-r border-stone-200 pr-4">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">Overview</Link>
              <Link to="/admin/trial" className="text-sm font-medium text-stone-500 hover:text-amber-700">Trial</Link>
              <Link to="/admin/users" className="text-sm font-medium text-stone-500 hover:text-amber-700">Users</Link>
              <Link to="/admin/invitations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
              <Link to="/admin/vouchers" className="text-sm font-medium text-stone-500 hover:text-amber-700">Gift Passes</Link>
              <Link to="/admin/feedback" className="text-sm font-bold text-stone-900">Feedback</Link>
            </nav>
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"><RefreshCw size={14} /> Refresh</button>
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"><ArrowLeft size={14} /> Back</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Bug} label="Open Bugs" value={overview.open_bugs || 0} color="text-red-600" />
          <StatCard icon={AlertCircle} label="Critical / High" value={`${overview.critical_bugs || 0} / ${overview.high_bugs || 0}`} color="text-orange-600" />
          <StatCard icon={Lightbulb} label="Under Review" value={overview.under_review || 0} color="text-blue-600" />
          <StatCard icon={Lightbulb} label="Planned" value={overview.planned || 0} color="text-purple-600" />
          <StatCard icon={ThumbsUp} label="Total Votes" value={overview.total_votes || 0} color="text-amber-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-stone-200">
          <button onClick={() => setTab('bugs')} className={`px-4 py-2 text-sm font-bold ${tab === 'bugs' ? 'border-b-2 border-amber-600 text-amber-700' : 'text-stone-500'}`}>Bug Reports ({data?.bugs?.length || 0})</button>
          <button onClick={() => setTab('features')} className={`px-4 py-2 text-sm font-bold ${tab === 'features' ? 'border-b-2 border-amber-600 text-amber-700' : 'text-stone-500'}`}>Feature Requests ({data?.features?.length || 0})</button>
          <button onClick={() => setTab('trial')} className={`px-4 py-2 text-sm font-bold ${tab === 'trial' ? 'border-b-2 border-amber-600 text-amber-700' : 'text-stone-500'}`}>Trial Feedback {trialFeedback ? `(${trialFeedback.overview?.total_submissions || 0})` : ''}</button>
        </div>

        {/* Filters */}
        {tab === 'bugs' ? (
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Search bugs..." value={bugFilter.search} onChange={e => setBugFilter({ ...bugFilter, search: e.target.value })} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <select value={bugFilter.status} onChange={e => setBugFilter({ ...bugFilter, status: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {BUG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Search features..." value={featureFilter.search} onChange={e => setFeatureFilter({ ...featureFilter, search: e.target.value })} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <select value={featureFilter.status} onChange={e => setFeatureFilter({ ...featureFilter, status: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {FEATURE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* List */}
        {tab === 'bugs' ? (
          <div className="space-y-3">
            {(data?.bugs || []).length === 0 ? <p className="py-8 text-center text-sm text-stone-400">No bug reports found.</p> : null}
            {(data?.bugs || []).map(bug => (
              <div key={bug.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">{bug.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        bug.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        bug.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        bug.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                      }`}>{bug.severity}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{bug.status}</span>
                      <span className="rounded-full bg-stone-50 px-2 py-0.5 text-xs text-stone-500">{bug.category}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{bug.description}</p>
                    {bug.reproduction_steps && <p className="mt-1 text-xs text-stone-500"><span className="font-bold">Repro:</span> {bug.reproduction_steps}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
                      <span>{bug.reporter_email}</span>
                      <span>{bug.browser} / {bug.os}</span>
                      {bug.route && <span>Route: {bug.route}</span>}
                      <span>{bug.created_at ? new Date(bug.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {bug.admin_notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800"><span className="font-bold">Admin notes: </span>{bug.admin_notes}</p>}
                  </div>
                  <button onClick={() => openEdit(bug, 'bug')} className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50">Edit</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.features || []).length === 0 ? <p className="py-8 text-center text-sm text-stone-400">No feature requests found.</p> : null}
            {(data?.features || []).map(feature => (
              <div key={feature.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">{feature.title}</p>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{feature.status}</span>
                      <span className="rounded-full bg-stone-50 px-2 py-0.5 text-xs text-stone-500">{feature.category}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700"><ThumbsUp size={10} /> {feature.vote_count}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{feature.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
                      <span>{feature.author_email}</span>
                      <span>{feature.created_at ? new Date(feature.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {feature.admin_response && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800"><span className="font-bold">Admin response: </span>{feature.admin_response}</p>}
                  </div>
                  <button onClick={() => openEdit(feature, 'feature')} className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

        {/* Trial Feedback tab */}
        {tab === 'trial' && (
          <div className="space-y-4">
            {trialFeedbackLoading && !trialFeedback ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
            ) : trialFeedback ? (
              <>
                {/* Overview metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard icon={ThumbsUp} label="Total Submissions" value={trialFeedback.overview?.total_submissions || 0} color="text-amber-600" />
                  <StatCard icon={ThumbsUp} label="Average Rating" value={`${trialFeedback.overview?.average_rating || 0} / 10`} color="text-blue-600" />
                  <StatCard icon={ThumbsUp} label="YES" value={`${trialFeedback.overview?.yes_pct || 0}% (${trialFeedback.overview?.yes_count || 0})`} color="text-green-600" />
                  <StatCard icon={ThumbsUp} label="NO" value={`${trialFeedback.overview?.no_pct || 0}% (${trialFeedback.overview?.no_count || 0})`} color="text-red-600" />
                </div>

                {/* Rating distribution */}
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">RATING DISTRIBUTION</h3>
                  <div className="flex items-end gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const count = trialFeedback.overview?.distribution?.[n] || 0;
                      const max = Math.max(...Object.values(trialFeedback.overview?.distribution || {}), 1);
                      const height = Math.max(4, (count / max) * 100);
                      return (
                        <div key={n} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-xs font-bold text-stone-600">{count}</span>
                          <div className="w-full rounded-t bg-amber-400" style={{ height: `${height}px` }} />
                          <span className="text-xs text-stone-500">{n}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stone-400"><span>1 = Poor</span><span>10 = Excellent</span></div>
                </div>

                {/* MAYBE */}
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center gap-4">
                    <div><span className="text-sm font-bold text-stone-700">MAYBE:</span> <span className="text-stone-600">{trialFeedback.overview?.maybe_pct || 0}% ({trialFeedback.overview?.maybe_count || 0})</span></div>
                  </div>
                </div>

                {/* Individual feedback records */}
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">FEEDBACK RECORDS ({trialFeedback.records?.length || 0})</h3>
                  {(trialFeedback.records || []).length === 0 ? (
                    <p className="py-4 text-center text-sm text-stone-400">No trial feedback submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {trialFeedback.records.map((r, idx) => (
                        <div key={r.id || idx} className="rounded-lg border border-stone-200 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Score: {r.feedback_score}/10</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.feedback_use_again === 'yes' ? 'bg-green-100 text-green-700' : r.feedback_use_again === 'no' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>{(r.feedback_use_again || '').toUpperCase()}</span>
                            <span className="text-sm font-bold text-stone-800">DJ {r.dj_nickname || '—'}</span>
                            <span className="text-xs text-stone-500">{r.email || ''}</span>
                            <span className="text-xs text-stone-400">{r.feedback_submitted_at ? new Date(r.feedback_submitted_at).toLocaleString() : ''}</span>
                          </div>
                          {r.feedback_comment && (
                            <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{r.feedback_comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-stone-400">Failed to load trial feedback.</p>
            )}
          </div>
        )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">Edit {editing.type === 'bug' ? 'Bug Report' : 'Feature Request'}</h3>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1 hover:bg-stone-100"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-bold text-stone-700">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                  {(editing.type === 'bug' ? BUG_STATUSES : FEATURE_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">{editing.type === 'bug' ? 'Admin Notes' : 'Admin Response'}</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : null} Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}