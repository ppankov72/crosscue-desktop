// National flag theme grid — 12 countries, hybrid chassis coloring.
import { flagCountries } from '@/lib/i18n/flags';
import { Check } from 'lucide-react';

export default function FlagThemeGrid({ current, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {flagCountries.map(country => {
        const themeCode = `flag-${country.code}`;
        const active = current === themeCode;
        return (
          <button
            key={country.code}
            onClick={() => onSelect(themeCode)}
            className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all ${
              active
                ? 'border-emerald-500 bg-emerald-500/10 text-white'
                : 'border-[#3a3a3a] bg-[#1a1a1a] text-[#bbb] hover:border-[#555] hover:bg-[#222]'
            }`}
          >
            {active && <Check size={12} className="absolute right-1 top-1 text-emerald-400" />}
            <span className="text-2xl leading-none">{country.flag}</span>
            <span className="text-center font-medium leading-tight">{country.name}</span>
          </button>
        );
      })}
    </div>
  );
}