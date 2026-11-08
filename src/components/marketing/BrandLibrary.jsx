import { useState } from 'react';
import { Plus, Copy, Check, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { BRAND_MESSAGES, CAMPAIGN_TEMPLATES, FUTURE_PAGE_MESSAGES, CHANNELS, OBJECTIVES } from '@/lib/marketing/constants';
import { Sparkles, PartyPopper } from 'lucide-react';

export default function BrandLibrary({ data, onDataChange }) {
  const [copied, setCopied] = useState(null);
  const [creating, setCreating] = useState(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const createFromTemplate = async (tpl) => {
    const code = `TPL-${Date.now().toString(36).toUpperCase()}`;
    setCreating(code);
    try {
      await base44.entities.MarketingCampaign.create({
        name: tpl.name,
        internal_code: code,
        message: tpl.message,
        objective: tpl.objective,
        cta: tpl.cta,
        landing_destination: tpl.landing_destination,
        channel: tpl.channel,
        status: 'draft',
        is_template: false,
        currency: 'EUR',
        spend_currency: 'EUR',
        language: 'en',
      });
      onDataChange?.();
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-900">Brand / Messaging Library</h2>
        <p className="text-sm text-stone-500">CROSSCUE brand positioning messages and campaign templates. Templates create draft campaigns — nothing is published automatically.</p>
      </div>

      {/* Brand Messages */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-stone-500" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-700">Brand Messages</h3>
        </div>
        <div className="space-y-2">
          {BRAND_MESSAGES.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-4 py-2.5">
              <div>
                <p className="font-medium text-stone-800">"{m.message}"</p>
                <p className="text-xs text-stone-400">Usage: {m.usage}</p>
              </div>
              <button onClick={() => copy(m.message, m.id)} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100">
                {copied === m.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Templates */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-700">Campaign Templates (Draft / Inactive)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPAIGN_TEMPLATES.map((tpl, i) => (
            <div key={i} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-stone-900">{tpl.name}</h4>
                  <p className="mt-1 text-sm italic text-stone-600">"{tpl.message}"</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">Objective: {OBJECTIVES.find(o => o.id === tpl.objective)?.label}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">Channel: {CHANNELS.find(c => c.id === tpl.channel)?.label}</span>
                  </div>
                  {tpl.cta && <p className="mt-1 text-xs text-stone-400">CTA: {tpl.cta}</p>}
                </div>
              </div>
              <button
                onClick={() => createFromTemplate(tpl)}
                disabled={creating !== null}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <Plus size={14} /> {creating ? 'Creating…' : 'Create Draft Campaign'}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Templates create campaigns in "Draft" status. No campaign is published or activated automatically.
        </p>
      </div>

      {/* Prepared Segment Messaging for /party, /schule, /start */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <PartyPopper size={18} className="text-amber-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">Prepared Messaging for Target Segments (/party, /schule, /start)</h3>
        </div>
        <p className="text-xs text-amber-800/80 mb-4">
          Pre-authored copy for young DJs, house parties, and school events. Ready to copy for social posts, ads, or future standalone landing pages (no new routes created).
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {FUTURE_PAGE_MESSAGES.map((msg, i) => (
            <div key={i} className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-800">{msg.route}</span>
                  <span className="text-[11px] font-semibold text-stone-500">{msg.target}</span>
                </div>
                <h4 className="font-bold text-stone-900 text-sm leading-snug">"{msg.headline}"</h4>
                <p className="text-xs text-stone-600 leading-relaxed">{msg.subheadline}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-stone-500 border-t border-stone-100 pt-2">
                  {msg.keyPoints.map((kp, j) => (
                    <li key={j} className="flex items-start gap-1">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-1 rounded">CTA: {msg.primaryCta}</span>
                <button
                  onClick={() => copy(`${msg.headline}\n\n${msg.subheadline}\n\nCTA: ${msg.primaryCta}`, `segment-${i}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
                  title="Copy segment message"
                >
                  {copied === `segment-${i}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  <span>{copied === `segment-${i}` ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product positioning reference */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-700">Product Positioning Reference (Free Core vs Premium)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-300 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-emerald-950">Free Core</h4>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">PERMANENT FREE</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-1">€0 <span className="text-xs font-normal text-emerald-700">unlimited playback</span></p>
            <ul className="mt-2 space-y-1 text-xs text-emerald-800">
              <li>✓ 100% free local file DJ mixing</li>
              <li>✓ Dual turntables, crossfader & EQ</li>
              <li>✓ No time limit — mix anytime</li>
              <li>✓ No installation & no card needed</li>
              <li>✓ Optional 40-min Premium trial</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900">Weekend Pass</h4>
              <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">ONE-TIME</span>
            </div>
            <p className="text-2xl font-bold text-amber-800 mt-1">€4.99 <span className="text-xs font-normal text-amber-700">/ 72 hours</span></p>
            <ul className="mt-2 space-y-1 text-xs text-stone-600">
              <li>✓ 72 hours of full Premium access</li>
              <li>✓ Session recording & export</li>
              <li>✓ Google Drive streaming</li>
              <li>✓ All custom MIDI mapping profiles</li>
            </ul>
          </div>
          <div className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900">Premium Monthly</h4>
              <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">ONGOING</span>
            </div>
            <p className="text-2xl font-bold text-stone-800 mt-1">€12.99<span className="text-xs font-normal text-stone-500"> / month</span></p>
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              <li>✓ Full unlimited ongoing access</li>
              <li>✓ Unlimited cloud, recording & MIDI</li>
              <li>✓ Priority support & early features</li>
              <li>✓ Cancel anytime with 1 click</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Core local mixing is 100% free with no time limit. Trial unlocks Premium features for 40 minutes without restricting core mixing after expiry.
        </p>
      </div>
    </div>
  );
}