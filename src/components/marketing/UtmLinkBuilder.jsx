import { useState, useMemo } from 'react';
import { Link2, Copy, Check, Plus, Trash2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CHANNELS, getChannelLabel } from '@/lib/marketing/constants';

export default function UtmLinkBuilder({ data, onDataChange }) {
  const campaigns = (data.campaigns || []).filter(c => !c.is_template);
  const links = data.links || [];
  const [form, setForm] = useState({
    campaign_id: '', label: '', destination_url: '/',
    utm_source: '', utm_medium: '', utm_campaign: '',
    utm_content: '', utm_term: '', campaign_code: '', variant: ''
  });
  const [copied, setCopied] = useState(null);
  const [saving, setSaving] = useState(false);

  const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://enlightened-deck-smith-pro.base44.app';

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill from campaign selection
  const selectCampaign = (id) => {
    const c = campaigns.find(c => c.id === id);
    if (c) {
      setForm(f => ({
        ...f,
        campaign_id: id,
        utm_campaign: c.internal_code || f.utm_campaign,
        campaign_code: c.internal_code || f.campaign_code,
        utm_source: c.channel || f.utm_source,
        destination_url: c.landing_destination || f.destination_url,
      }));
    } else {
      update('campaign_id', '');
    }
  };

  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (form.utm_source) params.set('utm_source', form.utm_source);
    if (form.utm_medium) params.set('utm_medium', form.utm_medium);
    if (form.utm_campaign) params.set('utm_campaign', form.utm_campaign);
    if (form.utm_content) params.set('utm_content', form.utm_content);
    if (form.utm_term) params.set('utm_term', form.utm_term);
    const qs = params.toString();
    if (!qs) return '';
    const dest = form.destination_url || '/';
    const base = dest.startsWith('http') ? dest : `${SITE_ORIGIN}${dest}`;
    return `${base}${base.includes('?') ? '&' : '?'}${qs}`;
  }, [form]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.campaign_id) { alert('Please select a campaign'); return; }
    setSaving(true);
    try {
      await base44.entities.CampaignLink.create({
        ...form,
        full_url: generatedUrl,
      });
      setForm({ campaign_id: '', label: '', destination_url: '/', utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '', campaign_code: '', variant: '' });
      onDataChange?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this link?')) return;
    await base44.entities.CampaignLink.delete(id);
    onDataChange?.();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-900">UTM / Tracking Link Builder</h2>
        <p className="text-sm text-stone-500">Generate campaign tracking URLs with UTM parameters. Links are tracked by Analytics V2.</p>
      </div>

      {/* Builder */}
      <form onSubmit={handleSave} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Campaign *</label>
            <select value={form.campaign_id} onChange={e => selectCampaign(e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
              <option value="">— Select Campaign —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.internal_code})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Link Label</label>
            <input value={form.label} onChange={e => update('label', e.target.value)} placeholder="e.g. Facebook Ad #1" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Destination URL</label>
          <input value={form.destination_url} onChange={e => update('destination_url', e.target.value)} placeholder="/ or /studio or full URL" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">utm_source</label>
            <input value={form.utm_source} onChange={e => update('utm_source', e.target.value)} placeholder="facebook" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">utm_medium</label>
            <input value={form.utm_medium} onChange={e => update('utm_medium', e.target.value)} placeholder="social" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">utm_campaign</label>
            <input value={form.utm_campaign} onChange={e => update('utm_campaign', e.target.value)} placeholder="weekend_launch" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">utm_content</label>
            <input value={form.utm_content} onChange={e => update('utm_content', e.target.value)} placeholder="ad_variant_a" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">utm_term (optional)</label>
            <input value={form.utm_term} onChange={e => update('utm_term', e.target.value)} placeholder="dj software" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Attribution Code</label>
            <input value={form.campaign_code} onChange={e => update('campaign_code', e.target.value.toUpperCase())} placeholder="WEEKEND01" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </div>
        </div>

        {/* Generated URL */}
        {generatedUrl && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <code className="flex-1 break-all text-xs text-stone-700">{generatedUrl}</code>
              <button type="button" onClick={() => copy(generatedUrl, 'gen')} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100">
                {copied === 'gen' ? <Check size={14} /> : <Copy size={14} />} Copy
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || !form.campaign_id} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
            <Plus size={16} /> {saving ? 'Saving…' : 'Save Link'}
          </button>
        </div>
      </form>

      {/* Existing links */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-700">Saved Links ({links.length})</h3>
        {links.length === 0 ? (
          <p className="text-sm text-stone-400">No tracking links saved yet.</p>
        ) : (
          <div className="space-y-2">
            {links.map(l => {
              const campaign = campaigns.find(c => c.id === l.campaign_id);
              return (
                <div key={l.id} className="rounded-lg border border-stone-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{l.label || 'Untitled'}</span>
                        {campaign && <span className="text-xs text-stone-400">· {campaign.name}</span>}
                        {l.variant && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">{l.variant}</span>}
                      </div>
                      <code className="mt-1 block break-all text-xs text-stone-500">{l.full_url}</code>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-stone-400">
                        {l.utm_source && <span>source: {l.utm_source}</span>}
                        {l.utm_medium && <span>· medium: {l.utm_medium}</span>}
                        {l.utm_campaign && <span>· campaign: {l.utm_campaign}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {l.full_url && <button onClick={() => copy(l.full_url, l.id)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100">{copied === l.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}</button>}
                      <a href={l.full_url} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-stone-400 hover:bg-stone-100"><ExternalLink size={14} /></a>
                      <button onClick={() => handleDelete(l.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}