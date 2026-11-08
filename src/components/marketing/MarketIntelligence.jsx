import { useState } from 'react';
import { Plus, Trash2, X, Edit3, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/marketing/constants';

const PRICING_MODELS = ['subscription', 'one-time', 'freemium', 'free', 'pay-what-you-want', 'other'];

export default function MarketIntelligence({ data, onDataChange }) {
  const entries = data.intelligence || [];
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (entry) => {
    setSaving(true);
    try {
      if (entry.id) {
        await base44.entities.MarketIntelligence.update(entry.id, entry);
      } else {
        await base44.entities.MarketIntelligence.create(entry);
      }
      setEditing(null);
      onDataChange?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await base44.entities.MarketIntelligence.delete(id);
    onDataChange?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Market Intelligence</h2>
          <p className="text-sm text-stone-500">Manual observations about competitors and products. This is a notebook, not a scraper.</p>
        </div>
        <button onClick={() => setEditing({ competitor_name: '', product_name: '', url: '', country: '', price: 0, currency: 'EUR', pricing_model: 'subscription', usp: '', target_audience: '', observed_campaign: '', observed_message: '', date_checked: new Date().toISOString().slice(0, 10), tags: '', notes: '' })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-sm text-stone-500">No intelligence entries yet. Record your first competitor observation.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map(e => (
            <div key={e.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900">{e.competitor_name}</h3>
                    {e.product_name && <span className="text-sm text-stone-500">— {e.product_name}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                    {e.country && <span>📍 {e.country}</span>}
                    {e.price > 0 && <span>💰 {formatCurrency(e.price, e.currency)}</span>}
                    {e.pricing_model && <span>📦 {e.pricing_model}</span>}
                    {e.date_checked && <span>📅 {e.date_checked}</span>}
                  </div>
                  {e.usp && <p className="mt-1 text-sm text-stone-600"><strong>USP:</strong> {e.usp}</p>}
                  {e.target_audience && <p className="text-sm text-stone-600"><strong>Audience:</strong> {e.target_audience}</p>}
                  {e.observed_campaign && <p className="text-sm text-stone-600"><strong>Observed:</strong> {e.observed_campaign}</p>}
                  {e.observed_message && <p className="text-sm text-stone-500 italic">"{e.observed_message}"</p>}
                  {e.tags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                        <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{t}</span>
                      ))}
                    </div>
                  )}
                  {e.notes && <p className="mt-2 text-sm text-stone-500">{e.notes}</p>}
                  {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"><ExternalLink size={12} /> {e.url}</a>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(e)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(e.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <IntelEditor entry={editing} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function IntelEditor({ entry, saving, onSave, onCancel }) {
  const [form, setForm] = useState(entry);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">{entry.id ? 'Edit Entry' : 'Add Intelligence'}</h2>
          <button onClick={onCancel} className="rounded p-1.5 text-stone-400 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Competitor Name *</label>
              <input required value={form.competitor_name} onChange={e => update('competitor_name', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Product Name</label>
              <input value={form.product_name} onChange={e => update('product_name', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">URL</label>
              <input value={form.url} onChange={e => update('url', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Country / Market</label>
              <input value={form.country} onChange={e => update('country', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Price</label>
              <input type="number" step="0.01" value={form.price} onChange={e => update('price', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Currency</label>
              <select value={form.currency} onChange={e => update('currency', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                {['EUR', 'USD', 'GBP', 'BGN', 'PLN', 'BRL', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Pricing Model</label>
              <select value={form.pricing_model} onChange={e => update('pricing_model', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                {PRICING_MODELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Date Checked</label>
              <input type="date" value={form.date_checked || ''} onChange={e => update('date_checked', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">USP</label>
            <input value={form.usp} onChange={e => update('usp', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Target Audience</label>
            <input value={form.target_audience} onChange={e => update('target_audience', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Observed Campaign</label>
            <input value={form.observed_campaign} onChange={e => update('observed_campaign', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Observed Message</label>
            <textarea value={form.observed_message} onChange={e => update('observed_message', e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="competitor, dj-software, subscription" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
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