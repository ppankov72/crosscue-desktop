// Phase G.1 — GDPR cookie consent context.
// Stores consent categories, timestamp, and policy version in localStorage.
// Default = NO optional tracking. Necessary always enabled.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ConsentContext = createContext(null);
const STORAGE_KEY = 'crosscue-consent';
const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
  externalMedia: false,
};

export function getStoredConsent() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_CONSENT;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return DEFAULT_CONSENT;
    return { ...DEFAULT_CONSENT, ...parsed };
  } catch {
    return DEFAULT_CONSENT;
  }
}

function loadConsent() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch { return null; }
}

function saveConsent(consent) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...consent,
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      }));
      window.dispatchEvent(new CustomEvent('crosscue-consent-changed', { detail: consent }));
    }
  } catch { /* ignore */ }
}

export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(DEFAULT_CONSENT);
  const [hasResponded, setHasResponded] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const stored = loadConsent();
    if (stored) {
      setConsent({ ...DEFAULT_CONSENT, ...stored });
      setHasResponded(true);
    } else {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const all = { ...DEFAULT_CONSENT, preferences: true, analytics: true, marketing: true, externalMedia: true };
    setConsent(all);
    saveConsent(all);
    setHasResponded(true);
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const rejectOptional = useCallback(() => {
    const rejected = { ...DEFAULT_CONSENT };
    setConsent(rejected);
    saveConsent(rejected);
    setHasResponded(true);
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const saveCustom = useCallback((custom) => {
    const next = { ...DEFAULT_CONSENT, ...custom, necessary: true };
    setConsent(next);
    saveConsent(next);
    setHasResponded(true);
    setShowBanner(false);
    setShowSettings(false);
  }, []);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  return (
    <ConsentContext.Provider value={{
      consent, hasResponded, showBanner, showSettings,
      acceptAll, rejectOptional, saveCustom, openSettings, closeSettings,
    }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) return { consent: DEFAULT_CONSENT, hasResponded: true, showBanner: false, showSettings: false, acceptAll: () => {}, rejectOptional: () => {}, saveCustom: () => {}, openSettings: () => {}, closeSettings: () => {} };
  return ctx;
}