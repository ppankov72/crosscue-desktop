import { useState } from 'react';
import { ACTION_CATEGORIES } from '@/lib/midi/actions';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

// Searchable CROSSCUE Action Browser — grouped by category.
// Only lists actions that actually exist in the MIDI engine.
export default function ActionBrowser({ onSelect, selected, compact, language }) {
  const { t } = useMidiTranslations(language);
  const [search, setSearch] = useState('');
  const [openCat, setOpenCat] = useState(null);

  const lower = search.toLowerCase();
  const filtered = ACTION_CATEGORIES.map(cat => ({
    ...cat,
    actions: cat.actions.filter(
      a => a.label.toLowerCase().includes(lower) || a.id.toLowerCase().includes(lower)
    ),
  })).filter(cat => cat.actions.length > 0);

  return (
    <div className={compact ? '' : 'border border-[#515a63] p-2'}>
      <input
        className="source-input w-full"
        placeholder={t.browser.searchPlaceholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
        {filtered.map(cat => (
          <div key={cat.id}>
            <button
              className="mini-button w-full justify-start"
              onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
            >
              {cat.label} ({cat.actions.length})
            </button>
            {openCat === cat.id && (
              <div className="mt-1 grid grid-cols-2 gap-1 pl-2">
                {cat.actions.map(a => (
                  <button
                    key={a.id}
                    className={`mini-button justify-start text-left ${selected === a.id ? 'vinyl-active' : ''}`}
                    onClick={() => onSelect(a.id)}
                    title={a.controlType}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-xs text-[#a49778]">{t.browser.noMatch(search)}</p>}
      </div>
    </div>
  );
}