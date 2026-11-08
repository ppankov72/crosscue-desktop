import { getStoredConsent } from '@/lib/landing/consentContext';

export const META_PIXEL_ID = '1453792916709017';
const SCRIPT_ID = 'crosscue-meta-pixel-script';
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

let pixelInitialized = false;
let consentGrantedState = false;
let lastPageViewPath = null;

function getSessionId() {
  const key = 'crosscue-analytics-session';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function hasSessionMarker(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setSessionMarker(key) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore storage errors
  }
}

export function hasMarketingConsent() {
  const consent = getStoredConsent();
  return Boolean(consent && consent.marketing === true);
}

/**
 * Checks whether Meta Events Manager explicit test mode is active in this tab.
 * Activated via URL query `?meta_pixel_test=1` (persisted in sessionStorage for the tab).
 */
export function isMetaTestMode() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_pixel_test') === '1') {
      sessionStorage.setItem('crosscue-meta-pixel-test-mode', '1');
      return true;
    }
    if (params.get('meta_pixel_test') === '0') {
      sessionStorage.removeItem('crosscue-meta-pixel-test-mode');
      return false;
    }
    return sessionStorage.getItem('crosscue-meta-pixel-test-mode') === '1';
  } catch {
    return false;
  }
}

/**
 * Prevents automated/preview/internal browser sessions from sending live Meta Pixel hits
 * unless explicit Meta Events Manager test mode (`?meta_pixel_test=1`) is active.
 */
export function isMetaBrowserOptedOut() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('crosscue-meta-pixel-optout') === '1';
  } catch {
    return false;
  }
}

export function setMetaBrowserOptOut(optedOut) {
  if (typeof window === 'undefined') return;
  try {
    if (optedOut) {
      localStorage.setItem('crosscue-meta-pixel-optout', '1');
      if (typeof window.fbq === 'function') {
        window.fbq('consent', 'revoke');
      }
    } else {
      localStorage.removeItem('crosscue-meta-pixel-optout');
    }
  } catch {
    // ignore
  }
}

export function isMetaTrafficSuppressed() {
  if (typeof window === 'undefined') return true;
  if (navigator.webdriver === true) return true;

  // Explicit Meta Events Manager test session (?meta_pixel_test=1) is allowed for verification
  if (isMetaTestMode()) {
    return false;
  }

  if (isMetaBrowserOptedOut()) return true;

  const hostname = window.location.hostname || '';
  const isPreviewOrDev =
    import.meta.env.DEV ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    (/^preview(-sandbox)?--/.test(hostname) && hostname.endsWith('.base44.app'));

  return isPreviewOrDev;
}

export function isMixIntentDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      localStorage.getItem('crosscue-debug-mix-intent') === '1' ||
      sessionStorage.getItem('crosscue-debug-mix-intent') === '1'
    );
  } catch {
    return false;
  }
}

export function getMetaIntentMixDiagnostics() {
  const sessionId = getSessionId();
  const sessionKey = `crosscue-meta-Intent_Mix_30s-${sessionId}`;
  const sessionMarkerExists = hasSessionMarker(sessionKey);
  const marketingConsent = hasMarketingConsent();
  const webdriver = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const testMode = isMetaTestMode();
  const browserOptedOut = isMetaBrowserOptedOut();
  const hostname = typeof window !== 'undefined' ? (window.location.hostname || '') : '';
  const isPreviewOrDev =
    import.meta.env.DEV ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    (/^preview(-sandbox)?--/.test(hostname) && hostname.endsWith('.base44.app'));

  let blockReason = null;
  if (!marketingConsent) {
    blockReason = 'marketing_consent_not_granted';
  } else if (webdriver) {
    blockReason = 'webdriver_detected';
  } else if (!testMode && browserOptedOut) {
    blockReason = 'browser_opted_out_localStorage_crosscue_meta_pixel_optout';
  } else if (!testMode && isPreviewOrDev) {
    blockReason = 'preview_or_dev_environment_without_meta_pixel_test_param';
  } else if (sessionMarkerExists) {
    blockReason = 'session_marker_already_exists';
  }

  return {
    sessionId,
    sessionKey,
    sessionMarkerExists,
    marketingConsent,
    testMode,
    browserOptedOut,
    isPreviewOrDev,
    webdriver,
    canFire: marketingConsent && !isMetaTrafficSuppressed(),
    blockReason
  };
}

export function canFireMetaPixel() {
  return hasMarketingConsent() && !isMetaTrafficSuppressed();
}

function ensureFbqStub() {
  if (typeof window === 'undefined') return null;
  if (window.fbq) return window.fbq;

  const n = function (...args) {
    if (n.callMethod) {
      n.callMethod.apply(n, args);
    } else {
      n.queue.push(args);
    }
  };
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  // Disable automatic SPA pushState PageView tracking to prevent duplicate PageViews
  n.disablePushState = true;
  n.allowDuplicatePageViews = false;
  window.fbq = n;
  return n;
}

/**
 * Dynamically loads and initializes Meta Pixel ONLY after explicit marketing consent.
 * Automatic Advanced Matching is disabled (empty object, no PII ever passed).
 */
export function initMetaPixelIfConsented() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!canFireMetaPixel()) return false;

  const fbq = ensureFbqStub();
  if (!fbq) return false;

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  if (!pixelInitialized) {
    fbq('consent', 'grant');
    // Explicitly pass empty object {} to disable Automatic Advanced Matching; never send PII
    fbq('init', META_PIXEL_ID, {});
    pixelInitialized = true;
    consentGrantedState = true;
  } else if (!consentGrantedState) {
    fbq('consent', 'grant');
    consentGrantedState = true;
  }

  return true;
}

/**
 * Revokes Meta Pixel consent immediately if the user withdraws marketing consent.
 */
export function syncMetaConsentState(consentDetail) {
  if (typeof window === 'undefined') return;
  const marketingGranted = Boolean(consentDetail?.marketing === true);
  if (!marketingGranted) {
    lastPageViewPath = null;
    if (typeof window.fbq === 'function' && pixelInitialized && consentGrantedState) {
      window.fbq('consent', 'revoke');
      consentGrantedState = false;
    }
    return;
  }
  initMetaPixelIfConsented();
}

/**
 * Standard Meta PageView — fired once per route view when marketing consent is granted.
 */
export function trackMetaPageView(pathname = window.location?.pathname || '/') {
  if (!canFireMetaPixel()) return false;
  if (!initMetaPixelIfConsented()) return false;

  const normalizedPath = String(pathname || '/');
  if (lastPageViewPath === normalizedPath) {
    return false;
  }
  lastPageViewPath = normalizedPath;

  const sessionId = getSessionId();
  const eventID = `PageView:${sessionId}:${normalizedPath}:${Date.now()}`;
  window.fbq('track', 'PageView', {}, { eventID });
  return true;
}

/**
 * Custom Meta Event: StartMix_Free — fired once per session on real Free Core playback start.
 */
export function trackMetaStartMixFree({ deckA = false, deckB = false } = {}) {
  if (!canFireMetaPixel()) return false;
  const sessionId = getSessionId();
  const sessionKey = `crosscue-meta-StartMix_Free-${sessionId}`;
  if (hasSessionMarker(sessionKey)) return false;

  if (!initMetaPixelIfConsented()) return false;
  setSessionMarker(sessionKey);

  const params = {
    mode: 'free_core',
    deck_a: Boolean(deckA),
    deck_b: Boolean(deckB),
    ...(isMetaTestMode() ? { test_traffic: true } : {})
  };
  window.fbq('trackCustom', 'StartMix_Free', params, {
    eventID: `StartMix_Free:${sessionId}`
  });
  return true;
}

/**
 * Custom Meta Event: Intent_Mix_30s — fired once per session when both decks play simultaneously for 30s.
 */
export function trackMetaIntentMix30s({ mode = 'free_core' } = {}) {
  const debug = isMixIntentDebugEnabled();
  const diagBefore = debug ? getMetaIntentMixDiagnostics() : null;

  if (!canFireMetaPixel()) {
    if (debug) {
      console.info('[Intent_Mix_30s Debug] trackMetaIntentMix30s blocked before send:', {
        result: false,
        reason: diagBefore?.blockReason || 'canFireMetaPixel_false',
        diagnostics: diagBefore
      });
    }
    return false;
  }
  const sessionId = getSessionId();
  const sessionKey = `crosscue-meta-Intent_Mix_30s-${sessionId}`;
  if (hasSessionMarker(sessionKey)) {
    if (debug) {
      console.info('[Intent_Mix_30s Debug] trackMetaIntentMix30s skipped (deduplicated):', {
        result: false,
        reason: 'session_marker_already_exists',
        sessionKey,
        sessionMarkerExists: true
      });
    }
    return false;
  }

  if (!initMetaPixelIfConsented()) {
    if (debug) {
      console.info('[Intent_Mix_30s Debug] trackMetaIntentMix30s failed initMetaPixelIfConsented:', {
        result: false,
        reason: 'pixel_init_failed'
      });
    }
    return false;
  }
  setSessionMarker(sessionKey);

  const params = {
    overlap_seconds: 30,
    mode: String(mode || 'free_core'),
    ...(isMetaTestMode() ? { test_traffic: true } : {})
  };
  const eventID = `Intent_Mix_30s:${sessionId}`;
  window.fbq('trackCustom', 'Intent_Mix_30s', params, {
    eventID
  });
  if (debug) {
    console.info('[Intent_Mix_30s Debug] trackMetaIntentMix30s dispatched to window.fbq:', {
      result: true,
      eventID,
      params,
      sessionKey,
      sessionMarkerSet: hasSessionMarker(sessionKey),
      fbqLoaded: Boolean(window.fbq?.callMethod)
    });
  }
  return true;
}

export function __resetMetaPixelForTests() {
  pixelInitialized = false;
  consentGrantedState = false;
  lastPageViewPath = null;
}