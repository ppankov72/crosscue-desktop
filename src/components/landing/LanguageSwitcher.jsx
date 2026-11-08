import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { languages } from '@/lib/landing/translations';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const current = languages.find(l => l.code === lang);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:border-amber-400 hover:text-amber-700">
        <Globe size={16} /> {current?.flag} {current?.label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-xl z-50">
          {languages.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition hover:bg-amber-50 ${lang === l.code ? 'font-bold text-amber-700' : 'text-stone-700'}`}>
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="flex-1 text-left">{l.name}</span>
              {lang === l.code && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}