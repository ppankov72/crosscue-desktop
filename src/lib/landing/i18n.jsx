import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { base44 } from '@/api/base44Client';
import { extractCmsContent } from '@/lib/cms/cmsDefaults';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'crosscue-ui-lang';

// Maps CMS section IDs to translation object keys
const SECTION_TO_TKEY = {
  hero: 'hero',
  liveDemo: 'liveDemo',
  why: 'why',
  features: 'features',
  demoTracks: 'demoTracks',
  pricing: 'pricing',
  downloads: 'downloads',
  community: 'community',
  docs: 'docs',
  footer: 'footer',
};

function detectLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Respect shared language choice even for languages without full static translations.
    // CMS content may provide translations; static text falls back to English.
    if (stored) return stored;
  } catch { /* ignore */ }
  const browser = (navigator.language || 'en').slice(0, 2);
  if (translations[browser]) return browser;
  return 'en';
}

// Deep-merge managed sections into the static translation object.
function mergeManaged(staticT, managedSections) {
  if (!managedSections || typeof managedSections !== 'object') return staticT;
  const merged = { ...staticT };
  for (const [section, content] of Object.entries(managedSections)) {
    const tkey = SECTION_TO_TKEY[section];
    if (!tkey || !content || typeof content !== 'object') continue;
    merged[tkey] = { ...staticT[tkey], ...content };
  }
  return merged;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);
  const [cmsPage, setCmsPage] = useState(null);
  const [cmsSettings, setCmsSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStoredLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Fetch CMS page and settings (one-time, all languages — efficient).
  // On any error, static translations are used (fail-safe).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.functions.invoke('getCmsPage', { slug: '/' }),
      base44.functions.invoke('getCmsSettings', {}),
    ]).then(([pageRes, settingsRes]) => {
      if (cancelled) return;
      if (pageRes.data?.found) setCmsPage(pageRes.data.page);
      if (settingsRes.data?.settings) setCmsSettings(settingsRes.data.settings);
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) { setCmsSettings({}); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, []);

  const staticT = translations[lang] || translations.en;

  // Extract CMS content for the current language and merge with static translations.
  // Complex structures (points, categories, plans) remain from static translations.
  const cmsContent = cmsPage?.content;
  const extracted = cmsContent ? extractCmsContent(cmsContent, lang) : {};
  // The CMS stores four languages; use the existing localized trial message for the others.
  if (extracted.hero && !cmsContent?.sections?.find(s => s.id === 'hero')?.elements?.subtitle?.[lang]) {
    extracted.hero.subtitle = staticT.hero.subtitle;
  }

  // Also merge footer from CMS settings if available
  const footerSetting = cmsSettings?.footer;
  if (footerSetting) {
    extracted.footer = {
      tagline: footerSetting.tagline?.[lang] || footerSetting.tagline?.en || staticT.footer?.tagline,
      subtitle: footerSetting.subtitle?.[lang] || footerSetting.subtitle?.en || staticT.footer?.subtitle,
      rights: footerSetting.rights?.[lang] || footerSetting.rights?.en || staticT.footer?.rights,
    };
  }

  const t = Object.keys(extracted).length > 0 ? mergeManaged(staticT, extracted) : staticT;

  const value = { lang, setLang, t, managedLoaded: loaded, cmsPage, cmsSettings };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: 'en', setLang: () => {}, t: translations.en, managedLoaded: true, cmsPage: null, cmsSettings: null };
  return ctx;
}

// Lightweight i18n hook for the Studio (outside LanguageProvider).
// Uses shared language storage so Studio UI labels sync with Portal + Landing.
import { detectLang, setStoredLang, SHARED_LANG_KEY } from '@/lib/i18n/sharedLang';
export function useTrialI18n() {
  const [lang, setLangState] = useState(() => {
    const detected = detectLang('en');
    return translations[detected] ? detected : 'en';
  });

  const setLang = (code) => {
    const next = translations[code] ? code : 'en';
    setLangState(next);
    setStoredLang(next);
    try { document.documentElement.lang = next; } catch { /* ignore */ }
  };

  useEffect(() => {
    const handleLangChanged = (e) => {
      const code = e?.detail || detectLang('en');
      const next = translations[code] ? code : 'en';
      setLangState(prev => (prev === next ? prev : next));
    };
    const handleStorage = (e) => {
      if (!e.key || e.key === SHARED_LANG_KEY) {
        const code = detectLang('en');
        const next = translations[code] ? code : 'en';
        setLangState(prev => (prev === next ? prev : next));
      }
    };
    window.addEventListener('crosscue-lang-changed', handleLangChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('crosscue-lang-changed', handleLangChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const t = translations[lang] || translations.en;
  return { lang, setLang, t };
}