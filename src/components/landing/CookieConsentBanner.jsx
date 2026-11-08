// Phase G.1 — GDPR cookie consent banner and settings modal.
import { useState } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import { useConsent } from '@/lib/landing/consentContext';
import { useI18n } from '@/lib/landing/i18n';
import { legalTranslations } from '@/lib/landing/legalTranslations';

export default function CookieConsentBanner() {
  const { consent, showBanner, showSettings, acceptAll, rejectOptional, saveCustom, openSettings, closeSettings } = useConsent();
  const { lang } = useI18n();
  const t = (legalTranslations[lang] || legalTranslations.en).cookie;
  const [custom, setCustom] = useState({ ...consent });

  if (!showBanner && !showSettings) return null;

  const categories = [
    { key: 'necessary', label: t.necessary, desc: t.necessaryDesc, locked: true },
    { key: 'preferences', label: t.preferences, desc: t.preferencesDesc },
    { key: 'analytics', label: t.analytics, desc: t.analyticsDesc },
    { key: 'marketing', label: t.marketing, desc: t.marketingDesc },
    { key: 'externalMedia', label: t.externalMedia, desc: t.externalMediaDesc },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6">
      {showSettings && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie size={20} className="text-amber-600" />
              <h3 className="text-lg font-bold text-stone-900">{t.settingsTitle}</h3>
            </div>
            <button onClick={closeSettings} className="rounded-lg p-1 hover:bg-stone-100"><X size={18} /></button>
          </div>
          <div className="mt-4 space-y-3">
            {categories.map(cat => (
              <label key={cat.key} className={`flex items-start gap-3 rounded-lg border border-stone-200 p-3 ${cat.locked ? 'bg-stone-50 opacity-75' : ''}`}>
                <input
                  type="checkbox"
                  checked={cat.locked ? true : custom[cat.key]}
                  disabled={cat.locked}
                  onChange={e => setCustom({ ...custom, [cat.key]: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-amber-600"
                />
                <div>
                  <p className="text-sm font-bold text-stone-900">{cat.label}{cat.locked && ' (always on)'}</p>
                  <p className="text-xs text-stone-500">{cat.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => saveCustom(custom)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
              <Check size={14} /> {t.save}
            </button>
            <button onClick={rejectOptional} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.rejectOptional}</button>
            <button onClick={acceptAll} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.acceptAll}</button>
          </div>
        </div>
      )}
      {showBanner && !showSettings && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <Cookie size={24} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-stone-900">{t.bannerTitle}</h3>
              <p className="mt-1 text-sm text-stone-600">{t.bannerText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={acceptAll} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">{t.acceptAll}</button>
                <button onClick={rejectOptional} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.rejectOptional}</button>
                <button onClick={openSettings} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.customize}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}