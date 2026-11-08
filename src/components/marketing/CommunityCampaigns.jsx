import { useState } from 'react';
import { Plus, Trash2, X, Trophy, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PLATFORMS = ['facebook', 'soundcloud', 'youtube', 'instagram', 'tiktok', 'mixcloud', 'other'];

export default function CommunityCampaigns({ data, onDataChange }) {
  const campaigns = (data.campaigns || []).filter(c => c.objective === 'community_engagement' || c.channel === 'community');
  const submissions = data.communitySubmissions || [];
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const defaultWeek = `${today.getFullYear()}-W${String(Math.ceil((today.getMonth() + 1) / 12 * 52)).padStart(2, '0')}`;

  const handleSave = async (sub) => {
    setSaving(true);
    try {
      if (sub.id) {
        await base44.entities.CommunitySubmission.update(sub.id, sub);
      } else {
        await base44.entities.CommunitySubmission.create(sub);
      }
      setEditing(null);
      onDataChange?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this submission?')) return;
    await base44.entities.CommunitySubmission.delete(id);
    onDataChange?.();
  };

  const toggleWinner = async (s) => {
    await base44.entities.CommunitySubmission.update(s.id, { ...s, is_winner: !s.is_winner });
    onDataChange?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Community Campaigns</h2>
          <p className="text-sm text-stone-500">Track community submissions and winners. Rewards use the existing Voucher system.</p>
        </div>
        <button onClick={() => setEditing({ campaign_id: campaigns[0]?.id || '', week_label: defaultWeek, participant_alias: '', external_post_url: '', track_url: '', genre: '', platform: 'facebook', votes: 0, reactions: '', is_winner: false, voucher_id: '', voucher_code: '', notes: '' })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
          <Plus size={16} /> Add Submission
        </button>
      </div>

      {campaigns.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No community campaigns yet. Create a campaign with objective "Community Engagement" or channel "Community" first.
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-sm text-stone-500">No submissions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map(s => {
            const campaign = campaigns.find(c => c.id === s.campaign_id);
            return (
              <div key={s.id} className={`rounded-xl border p-4 ${s.is_winner ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{s.participant_alias}</span>
                      {s.is_winner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800"><Trophy size={12} /> Winner</span>}
                      {s.week_label && <span className="text-xs text-stone-400">· {s.week_label}</span>}
                    </div>
                    {campaign && <p className="text-xs text-stone-400">{campaign.name}</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                      {s.genre && <span>Genre: {s.genre}</span>}
                      {s.platform && <span>· {s.platform}</span>}
                      {s.votes > 0 && <span>· {s.votes} votes</span>}
                      {s.voucher_code && <span className="font-medium text-green-700">· Voucher: {s.voucher_code}</span>}
                    </div>
                    {s.track_url && <a href={s.track_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-amber-700 hover:underline truncate">{s.track_url}</a>}
                    {s.external_post_url && <a href={s.external_post_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-stone-400 hover:underline truncate">{s.external_post_url}</a>}
                    {s.notes && <p className="mt-1 text-xs text-stone-500">{s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleWinner(s)} className={`rounded p-1.5 ${s.is_winner ? 'text-amber-600 hover:bg-amber-100' : 'text-stone-400 hover:bg-stone-100'}`} title="Toggle winner">
                      <Award size={15} />
                    </button>
                    <button onClick={() => setEditing(s)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <SubmissionEditor submission={editing} campaigns={campaigns} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function SubmissionEditor({ submission, campaigns, saving, onSave, onCancel }) {
  const [form, setForm] = useState(submission);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">{submission.id ? 'Edit Submission' : 'Add Submission'}</h2>
          <button onClick={onCancel} className="rounded p-1.5 text-stone-400 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Campaign</label>
            <select value={form.campaign_id} onChange={e => update('campaign_id', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
              <option value="">— Select —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Participant Alias *</label>
              <input required value={form.participant_alias} onChange={e => update('participant_alias', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Week</label>
              <input value={form.week_label} onChange={e => update('week_label', e.target.value)} placeholder="2026-W37" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Genre</label>
              <input value={form.genre} onChange={e => update('genre', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Platform</label>
              <select value={form.platform} onChange={e => update('platform', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">External Post URL</label>
            <input value={form.external_post_url} onChange={e => update('external_post_url', e.target.value)} placeholder="https://facebook.com/..." className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Track URL</label>
            <input value={form.track_url} onChange={e => update('track_url', e.target.value)} placeholder="https://soundcloud.com/..." className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Votes</label>
              <input type="number" value={form.votes} onChange={e => update('votes', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Reactions Summary</label>
              <input value={form.reactions} onChange={e => update('reactions', e.target.value)} placeholder="👍 42 · ❤️ 15" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <input type="checkbox" checked={form.is_winner} onChange={e => update('is_winner', e.target.checked)} className="rounded" />
              Mark as winner
            </label>
          </div>
          {form.is_winner && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Voucher Code (reward reference)</label>
                <input value={form.voucher_code} onChange={e => update('voucher_code', e.target.value)} placeholder="CC-WEEKEND-XXXX" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Voucher ID (optional)</label>
                <input value={form.voucher_id} onChange={e => update('voucher_id', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}