import { Link } from 'react-router-dom';
import { Globe, Sliders, ExternalLink, Check } from 'lucide-react';

// Portal Settings — language selector with flags, theme info, links to DJ settings.
export default function PortalSettings({ t, lang, changeLang, languages }) {
  const isSystem = !lang || lang === 'system';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.settings.title}</h2>

      {/* Language — clean list with flags, matching reference design */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-stone-500">
          <Globe size={14} /> {t.settings.language}
        </h3>
        <p className="mb-4 text-sm text-stone-400">Select a language for CROSSCUE. System follows your browser.</p>

        <div className="space-y-2">
          {/* System option */}
          <button
            onClick={() => changeLang('system')}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
              isSystem ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <Globe size={20} className="text-stone-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-stone-800">System</div>
              <div className="text-xs text-stone-400">Follows browser language</div>
            </div>
            {isSystem && <Check size={18} className="text-emerald-600" />}
          </button>

          {/* Language options */}
          {languages.map(l => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => changeLang(l.code)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  active ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span className="text-2xl leading-none">{l.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-stone-800">{l.label}</div>
                  <div className="text-xs text-stone-400">{l.name}</div>
                </div>
                {active && <Check size={18} className="text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* DJ Settings */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.settings.interface} & {t.settings.audio}</h3>
        <p className="text-sm text-stone-500">DJ settings are available in the CROSSCUE app.</p>
        <Link to="/" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
          <Sliders size={14} /> {t.settings.openSettings}
        </Link>
      </div>

      {/* Open CROSSCUE */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800">
          <ExternalLink size={14} /> {t.settings.openApp}
        </Link>
      </div>
    </div>
  );
}