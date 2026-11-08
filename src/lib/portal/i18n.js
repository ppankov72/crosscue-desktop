// Portal i18n hook — uses shared UI language storage (syncs with Landing + Studio).
import { useState, useEffect, useCallback } from 'react';
import { portalTranslations } from './translations';
import { getStoredLang, setStoredLang, supportedLangCodes } from '@/lib/i18n/sharedLang';
import { uiLanguages } from '@/lib/i18n/flags';

const SHARED_LANG_KEY = 'crosscue-ui-lang';

function browserLang() {
  const b = (navigator.language || 'en').slice(0, 2);
  return supportedLangCodes.includes(b) ? b : 'en';
}

export function usePortalI18n() {
  const [lang, setLang] = useState(() => getStoredLang() || 'system');

  useEffect(() => {
    if (lang === 'system') {
      try { localStorage.removeItem(SHARED_LANG_KEY); } catch {}
    } else {
      setStoredLang(lang);
    }
  }, [lang]);

  const translationLang = lang === 'system' ? browserLang() : lang;
  const t = portalTranslations[translationLang] || portalTranslations.en;
  const changeLang = useCallback((code) => { setLang(code); }, []);

  return { t, lang, changeLang, languages: uiLanguages };
}