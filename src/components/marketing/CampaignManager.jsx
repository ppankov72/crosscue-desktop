import { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, X, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CHANNELS, OBJECTIVES, CAMPAIGN_STATUS, DJ_SEGMENTS, MARKETS, getStatusMeta, getChannelLabel, getObjectiveLabel, formatCurrency, formatPercent, formatNumber } from '@/lib/marketing/constants';

const EMPTY_CAMPAIGN = {
  name: '', internal_code: '', description: '', objective: 'trial', status: 'idea',
  start_date: '', end_date: '', target_market: '', target_audience: '', language: 'en',
  currency: 'EUR', channel: 'other', message: '', cta: '', landing_destination: '/',
  campaign_code: '', budget: 0, actual_spend: 0, spend_currency: 'EUR', notes: '',
  target_visits: 0, target_registrations: 0, target_trials: 0, target_paid: 0,
  target_revenue: 0, max_cac: 0, target_roas: 0, voucher_campaign_tag: '',
  is_template: false, parent_campaign_id: '', variant_label: '',
  content_headline: '', content_body: '', content_cta: '', asset_url: ''
};

export default function CampaignManager({ data, onDataChange }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showTemplates, setShowTemplates] = useState(false);
  const campaigns = (data.campaigns || []).filter(c => !c.is_template || showTemplates);

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const handleSave = async (campaign) => {
    if (campaign.id) {
      await base44.entities.MarketingCampaign.update(campaign.id, campaign);
    } else {
      await base44.entities.MarketingCampaign.create(campaign);
    }
    setEditing(null);
    onDataChange?.();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    await base44.entities.MarketingCampaign.delete(id);
    onDataChange?.();
  };

  const handleDuplicate = async (c) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = c;
    await base44.entities.MarketingCampaign.create({
      ...rest,
      name: `${c.name} (Copy)`,
      internal_code: `${c.internal_code}-COPY`,
      status: 'draft',
      is_template: false,
    });
    onDataChange?.();
  };

  const createVariant = (parent) => {
    setEditing({
      ...EMPTY_CAMPAIGN,
      name: `${parent.name} - Variant B`,
      internal_code: `${parent.internal_code}-B`,
      campaign_code: `${parent.internal_code}-B`,
      parent_campaign_id: parent.id,
      variant_label: 'B',
      objective: parent.objective,
      channel: parent.channel,
      target_market: parent.target_market,
      target_audience: parent.target_audience,
      status: 'draft',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-stone-900">Campaigns</h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-stone-500">
            <input type="checkbox" checked={showTemplates} onChange={e => setShowTemplates(e.target.checked)} className="rounded" />
            Show templates
          </label>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
            <option value="all">All statuses</option>
            {CAMPAIGN_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button onClick={() => setEditing({ ...EMPTY_CAMPAIGN })} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-sm text-stone-500">No campaigns yet. Create your first campaign or start from a template in the Brand / Templates tab.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => {
            const sm = getStatusMeta(c.status);
            const goalStatus = computeGoalStatus(c);
            return (
              <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900">{c.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sm.color}`}>{sm.label}</span>
                      {c.variant_label && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Variant {c.variant_label}</span>}
                      {c.is_template && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Template</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-400">{c.internal_code} · {getObjectiveLabel(c.objective)} · {getChannelLabel(c.channel)} {c.target_market && `· ${c.target_market}`}</p>
                    {c.message && <p className="mt-1 text-sm text-stone-600">"{c.message}"</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!c.is_template && c.status !== 'archived' && (
                      <button onClick={() => createVariant(c)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" title="Create A/B variant">
                        <Copy size={15} />
                      </button>
                    )}
                    <button onClick={() => setEditing({ ...EMPTY_CAMPAIGN, ...c })} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" title="Edit">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDuplicate(c)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" title="Duplicate">
                      <Plus size={15} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {/* Metrics row */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  <Metric label="Visits" value={formatNumber(c.visits)} />
                  <Metric label="StartMix_Free" value={formatNumber(c.startMixFree || 0)} />
                  <Metric label="Intent_Mix_30s" value={formatNumber(c.intentMix30s || 0)} />
                  <Metric label="Trials" value={formatNumber(c.trials)} />
                  <Metric label="Purchases" value={formatNumber(c.purchases)} />
                  <Metric label="Revenue" value={formatCurrency(c.revenue, c.currency)} />
                  <Metric label="Spend" value={formatCurrency(c.actual_spend, c.spend_currency)} />
                  <Metric label="ROAS" value={c.roas !== null ? formatPercent(c.roas) : 'N/A'} />
                </div>
                {/* Goals */}
                {(c.target_visits > 0 || c.target_paid > 0 || c.target_revenue > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.target_visits > 0 && <GoalBadge label="Visits" current={c.visits} target={c.target_visits} />}
                    {c.target_trials > 0 && <GoalBadge label="Trials" current={c.trials} target={c.target_trials} />}
                    {c.target_paid > 0 && <GoalBadge label="Paid" current={c.purchases} target={c.target_paid} />}
                    {c.target_revenue > 0 && <GoalBadge label="Revenue" current={c.revenue} target={c.target_revenue} isCurrency />}
                    {goalStatus && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${goalStatus.cls}`}>{goalStatus.label}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CampaignEditor
          campaign={editing}
          campaigns={data.campaigns}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-sm font-bold text-stone-800">{value}</p>
    </div>
  );
}

function GoalBadge({ label, current, target, isCurrency }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-700">{isCurrency ? formatCurrency(current) : formatNumber(current)} / {isCurrency ? formatCurrency(target) : formatNumber(target)}</span>
      <span className="text-stone-400">({pct.toFixed(0)}%)</span>
    </div>
  );
}

function computeGoalStatus(c) {
  const checks = [];
  if (c.target_paid > 0) checks.push({ current: c.purchases, target: c.target_paid });
  if (c.target_revenue > 0) checks.push({ current: c.revenue, target: c.target_revenue });
  if (checks.length === 0) return null;

  const now = new Date();
  const isFinished = c.status === 'finished' || (c.end_date && new Date(c.end_date) < now);
  if (!isFinished) return null;

  const allOnTarget = checks.every(ch => ch.current >= ch.target);
  const anyOnTarget = checks.some(ch => ch.current >= ch.target * 0.7);

  if (allOnTarget) return { label: 'ON TARGET', cls: 'bg-green-100 text-green-700' };
  if (anyOnTarget) return { label: 'WARNING', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'BELOW TARGET', cls: 'bg-red-100 text-red-700' };
}

function CampaignEditor({ campaign, campaigns, onSave, onCancel }) {
  const [form, setForm] = useState(campaign);
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const parentCampaign = campaigns.find(c => c.id === form.parent_campaign_id);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">{campaign.id ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onCancel} className="rounded p-1.5 text-stone-400 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          {/* Basic */}
          <Section title="Basic Information">
            <Field label="Campaign Name *">
              <input required value={form.name} onChange={e => update('name', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
            <Field label="Internal Code *">
              <input required value={form.internal_code} onChange={e => update('internal_code', e.target.value.toUpperCase())} placeholder="e.g. WEEKEND01" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
          </Section>

          {/* Strategy */}
          <Section title="Strategy & Targeting">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Objective">
                <select value={form.objective} onChange={e => update('objective', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  {OBJECTIVES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  {CAMPAIGN_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Channel">
                <select value={form.channel} onChange={e => update('channel', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  {CHANNELS.map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
                </select>
              </Field>
              <Field label="Target Market">
                <select value={form.target_market} onChange={e => update('target_market', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  <option value="">— Select —</option>
                  {MARKETS.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Target Audience">
                <select value={form.target_audience} onChange={e => update('target_audience', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  <option value="">— Select —</option>
                  {DJ_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Language">
                <input value={form.language} onChange={e => update('language', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
              <Field label="Start Date">
                <input type="date" value={form.start_date || ''} onChange={e => update('start_date', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.end_date || ''} onChange={e => update('end_date', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
            </div>
          </Section>

          {/* Message */}
          <Section title="Message & Content">
            <Field label="Headline / Message">
              <input value={form.message} onChange={e => update('message', e.target.value)} placeholder="e.g. 40 minutes. Full CROSSCUE. Zero ads." className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CTA">
                <input value={form.cta} onChange={e => update('cta', e.target.value)} placeholder="e.g. Start Free Trial" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
              <Field label="Landing Destination">
                <input value={form.landing_destination} onChange={e => update('landing_destination', e.target.value)} placeholder="/ or /studio" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
            </div>
            <Field label="Content Headline (variant)">
              <input value={form.content_headline} onChange={e => update('content_headline', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
            <Field label="Content Body Copy">
              <textarea value={form.content_body} onChange={e => update('content_body', e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
          </Section>

          {/* Budget */}
          <Section title="Budget & Spend">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Budget">
                <input type="number" step="0.01" value={form.budget} onChange={e => update('budget', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
              <Field label="Actual Spend">
                <input type="number" step="0.01" value={form.actual_spend} onChange={e => update('actual_spend', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
              </Field>
              <Field label="Currency">
                <select value={form.spend_currency} onChange={e => update('spend_currency', e.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  {['EUR', 'USD', 'GBP', 'BGN', 'PLN', 'BRL', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Goals */}
          <Section title="Goals / Targets">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Target Visits"><input type="number" value={form.target_visits} onChange={e => update('target_visits', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
              <Field label="Target Registrations"><input type="number" value={form.target_registrations} onChange={e => update('target_registrations', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
              <Field label="Target Trials"><input type="number" value={form.target_trials} onChange={e => update('target_trials', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
              <Field label="Target Paid"><input type="number" value={form.target_paid} onChange={e => update('target_paid', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
              <Field label="Target Revenue"><input type="number" step="0.01" value={form.target_revenue} onChange={e => update('target_revenue', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
              <Field label="Max CAC"><input type="number" step="0.01" value={form.max_cac} onChange={e => update('max_cac', Number(e.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" /></Field>
            </div>
          </Section>

          {/* Voucher link */}
          <Section title="Reward / Voucher Link">
            <Field label="Voucher Campaign Tag (links to Voucher.source_campaign)">
              <input value={form.voucher_campaign_tag} onChange={e => update('voucher_campaign_tag', e.target.value)} placeholder="e.g. AI_TRACK_OF_THE_WEEK" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
            </Field>
            <p className="text-xs text-stone-400">Links this campaign to existing vouchers via their source_campaign field. Does not create vouchers.</p>
          </Section>

          {parentCampaign && (
            <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">
              A/B Variant of: <strong>{parentCampaign.name}</strong> · Variant {form.variant_label}
            </div>
          )}

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800" />
          </Field>

          <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      {children}
    </div>
  );
}