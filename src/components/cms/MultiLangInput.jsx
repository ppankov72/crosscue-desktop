import React from 'react';

export const CMS_LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'bg', label: 'BG' },
];

// Reusable multilingual text input (EN, DE, ES, BG).
// value: { en: '', de: '', es: '', bg: '' }
// onChange: (newValue) => void
export default function MultiLangInput({ label, value, onChange, type = 'input', placeholder = '' }) {
  const v = value || { en: '', de: '', es: '', bg: '' };
  const update = (lang, text) => onChange({ ...v, [lang]: text });
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-bold text-stone-500">{label}</label>}
      <div className="grid grid-cols-2 gap-1.5">
        {CMS_LANGS.map(l => (
          <div key={l.code} className="flex items-center gap-1">
            <span className="w-6 shrink-0 text-xs font-bold text-stone-400">{l.label}</span>
            {type === 'textarea' ? (
              <textarea
                value={v[l.code] || ''}
                onChange={e => update(l.code, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-sm text-stone-800"
              />
            ) : (
              <input
                type="text"
                value={v[l.code] || ''}
                onChange={e => update(l.code, e.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-sm text-stone-800"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}