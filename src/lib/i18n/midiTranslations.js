import { useState, useEffect } from 'react';
import { detectLang, SHARED_LANG_KEY } from '@/lib/i18n/sharedLang';

import { en } from './midi/en';
import { bg } from './midi/bg';
import { de } from './midi/de';
import { es } from './midi/es';
import { fr } from './midi/fr';
import { it } from './midi/it';
import { nl } from './midi/nl';
import { sr } from './midi/sr';
import { ru } from './midi/ru';
import { ro } from './midi/ro';
import { tr } from './midi/tr';
import { el } from './midi/el';

export const midiTranslations = {
  en,
  bg,
  de,
  es,
  fr,
  it,
  nl,
  sr,
  ru,
  ro,
  tr,
  el,
};

// React hook for instant, reactive MIDI translations without page reload
export function useMidiTranslations(overrideLang) {
  const [lang, setLang] = useState(() => {
    if (overrideLang && midiTranslations[overrideLang]) return overrideLang;
    const detected = detectLang('en');
    return midiTranslations[detected] ? detected : 'en';
  });

  useEffect(() => {
    if (overrideLang && midiTranslations[overrideLang]) {
      setLang(overrideLang);
      return;
    }

    const handleLangChange = (e) => {
      const code = e?.detail || detectLang('en');
      if (midiTranslations[code]) setLang(code);
    };

    const handleStorage = (e) => {
      if (e.key === SHARED_LANG_KEY) {
        const code = detectLang('en');
        if (midiTranslations[code]) setLang(code);
      }
    };

    window.addEventListener('crosscue-lang-changed', handleLangChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('crosscue-lang-changed', handleLangChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [overrideLang]);

  const t = midiTranslations[lang] || midiTranslations.en;
  return { t, lang, setLang };
}