// Shared UI language storage — one key drives Portal, Landing, and Studio UI labels.
// Studio deck controls remain English; this only affects user-facing labels.

export const SHARED_LANG_KEY = 'crosscue-ui-lang';

// Legacy keys for backward compatibility (one-time migration).
const LEGACY_KEYS = ['crosscue-portal-lang', 'crosscue-landing-lang'];

export const supportedLangCodes = [
  'en', 'bg', 'de', 'it', 'es', 'fr', 'nl', 'sr', 'ru', 'ro', 'tr', 'el',
];

export function getStoredLang() {
  try {
    const stored = localStorage.getItem(SHARED_LANG_KEY);
    if (stored && supportedLangCodes.includes(stored)) return stored;
    // Migrate from legacy keys.
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy && supportedLangCodes.includes(legacy)) {
        localStorage.setItem(SHARED_LANG_KEY, legacy);
        return legacy;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export function setStoredLang(code) {
  try {
    localStorage.setItem(SHARED_LANG_KEY, code);
    // Clean up legacy keys.
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crosscue-lang-changed', { detail: code }));
    }
  } catch { /* ignore */ }
}

export function detectLang(fallback = 'en') {
  const stored = getStoredLang();
  if (stored) return stored;
  const browser = (navigator.language || 'en').slice(0, 2);
  return supportedLangCodes.includes(browser) ? browser : fallback;
}