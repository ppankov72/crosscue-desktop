import { useState } from 'react';
import { BookOpen, Plus, Trash2, X, Edit3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CampaignLessons({ data, onDataChange }) {
  const campaigns = (data.campaigns || []).filter(c => !c.is_template && (c.status === 'finished' || c.status === 'archived' || c.status === 'active' || c.status === 'paused'));
  const lessons = data.lessons || [];
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (lesson) => {
    setSaving(true);
    try {
      if (lesson.id) {
        await base44.entities.CampaignLesson.update(lesson.id, lesson);
      } else {
        await base44.entities.CampaignLesson.create(lesson);
      }
      setEditing(null);
      onDataChange?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lesson?')) return;
    await base44.entities.CampaignLesson.delete(id);
    onDataChange?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Lessons Learned</h2>
          <p className="text-sm text-stone-500">Record what worked and what didn't for finished campaigns.</p>
        </div>
        <button onClick={() => setEditing({ campaign_id: campaigns[0]?.id || '', what_worked: '', what_did_not_work: '', best_message: '', best_channel: '', best_market: '', unexpected_result: '', what_to_repeat: '', what_to_avoid: '', next_experiment: '' })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
          <Plus size={16} /> Add Lesson
        </button>
      </div>

      {campaigns.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No campaigns available for lessons. Create a campaign first.
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">No lessons recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map(l => {
            const campaign = (data.campaigns || []).find(c => c.id === l.campaign_id);
            return (
              <div key={l.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-stone-900">{campaign?.name || 'Unknown Campaign'}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {l.what_worked && <LessonField label="What Worked" value={l.what_worked} positive />}
                      {l.what_did_not_work && <LessonField label="What Didn't Work" value={l.what_did_not_work} negative />}
                      {l.best_message && <LessonField label="Best Message" value={l.best_message} />}
                      {l.best_channel && <LessonField label="Best Channel" value={l.best_channel} />}
                      {l.best_market && <LessonField label="Best Market" value={l.best_market} />}
                      {l.unexpected_result && <LessonField label="Unexpected Result" value={l.unexpected_result} />}
                      {l.what_to_repeat && <LessonField label="Repeat" value={l.what_to_repeat} positive />}
                      {l.what_to_avoid && <LessonField label="Avoid" value={l.what_to_avoid} negative />}
                      {l.next_experiment && <LessonField label="Next Experiment" value={l.next_experiment} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(l)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Edit3 size={15} /></button>
                    <button onClick={() => handleDelete(l.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <LessonEditor lesson={editing} campaigns={campaigns} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function LessonField({ label, value, positive, negative }) {
  const color = positive ? 'text-green-700' : negative ? 'text-red-700' : 'text-stone-600';
  const bg = positive ? 'bg-green-50' : negative ? 'bg-red-50' : 'bg-stone-50';
  return (
    <div className={`rounded-lg p-2.5 ${bg}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-0.5 text-sm ${color}`}>{value}</p>
    </div>
  );
}

function LessonEditor({ lesson, campaigns, saving, onSave, onCancel }) {
  const [form, setForm] = useState(lesson);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fields = [
    { key: 'what_worked', label: 'What Worked?', type: 'textarea' },
    { key: 'what_did_not_work', label: "What Didn't Work?", type: 'textarea' },
    { key: 'best_message', label: 'Best Message', type: 'text' },
    { key: 'best_channel', label: 'Best Channel', type: 'text' },
    { key: 'best_market', label: 'Best Market', type: 'text' },
    { key: 'unexpected_result', label: 'Unexpected Result', type: 'textarea' },
    { key: 'what_to_repeat', label: 'What to Repeat?', type: 'textarea' },
    { key: 'what_to_avoid', label: 'What to Avoid?', type: 'textarea' },
    { key: 'next_experiment', label: 'Next Experiment', type: 'textarea' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">{lesson.id ? 'Edit Lesson' : 'Add Lesson'}</h2>
          <button onClick={onCancel} className="rounded p-1.5 text-stone-400 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Campaign</label>
            <select value={form.campaign_id} onChange={e => update('campaign_id', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
              <option value="">— Select —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {fields.map(f => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-stone-600">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              ) : (
                <input value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}