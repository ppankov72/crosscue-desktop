import { base44 } from '@/api/base44Client';
import { getStoredConsent } from '@/lib/landing/consentContext';
import { isTauriDesktop } from '@/lib/crosscue/freemium';

const memory = {};
function stored(key, storage, create) {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = create();
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return memory[key] || (memory[key] = create());
  }
}

export const NECESSARY_FUNCTIONAL_EVENTS = [
  'trial_started',
  'trial_playback_started',
  'trial_playback_10min',
  'trial_playback_25min',
  'trial_exhausted',
  'trial_feedback',
  'trial_expired',
  'signup',
  'login',
  'logout',
  'signup_completed'
];

export const ANALYTICS_EVENTS = [
  'pageview',
  'session_start',
  'playback_start',
  'playback_stop',
  'StartMix_Free',
  'Intent_Mix_30s',
  'custom'
];

export const MARKETING_EVENTS = [
  'landing_view',
  'launch_clicked'
];

export function canSendEvent(eventType) {
  if (isTauriDesktop()) return false;
  const consent = getStoredConsent();
  if (NECESSARY_FUNCTIONAL_EVENTS.includes(eventType)) {
    return true;
  }
  if (MARKETING_EVENTS.includes(eventType)) {
    return Boolean(consent?.marketing);
  }
  if (ANALYTICS_EVENTS.includes(eventType)) {
    return Boolean(consent?.analytics);
  }
  return Boolean(consent?.analytics);
}

export function getAnalyticsContext() {
  const consent = getStoredConsent();
  const hasAnalyticsConsent = Boolean(consent?.analytics);
  const hasMarketingConsent = Boolean(consent?.marketing);

  const installation_id = stored('crosscue-installation-id', localStorage, () => crypto.randomUUID());
  const session_id = stored('crosscue-analytics-session', sessionStorage, () => crypto.randomUUID());
  const browser_token = hasAnalyticsConsent
    ? stored('crosscue-analytics-browser-token', localStorage, () => crypto.randomUUID() + crypto.randomUUID())
    : '';

  let utm = { source: '', medium: '', campaign: '' };
  let touch = { landing_page: window.location.pathname, referrer: '' };
  let referrer = '';

  if (hasMarketingConsent) {
    const params = new URLSearchParams(window.location.search);
    utm = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || ''
    };
    referrer = document.referrer || '';
    try {
      touch = JSON.parse(stored('crosscue-first-touch', localStorage, () => JSON.stringify({
        ...utm,
        referrer,
        landing_page: window.location.pathname,
        timestamp: new Date().toISOString()
      })));
    } catch {
      touch = { landing_page: window.location.pathname, referrer };
    }
  }

  const hostname = window.location.hostname;
  const preview = /^preview(-sandbox)?--/.test(hostname) && hostname.endsWith('.base44.app');

  return {
    installation_id,
    anonymous_id: installation_id,
    session_id,
    browser_token,
    utm,
    first_touch: touch,
    landing_page: touch.landing_page || window.location.pathname,
    page: window.location.pathname,
    referrer,
    origin: window.location.origin,
    environment: preview ? 'preview' : import.meta.env.DEV ? 'development' : 'production',
    webdriver: navigator.webdriver === true,
    consent: {
      analytics: hasAnalyticsConsent,
      marketing: hasMarketingConsent
    }
  };
}

export function sendAnalytics(event_type, custom_data = {}, is_trial_user = false) {
  if (isTauriDesktop()) {
    return Promise.resolve(null);
  }
  if (!canSendEvent(event_type)) {
    return Promise.resolve(null);
  }
  return base44.functions.invoke('logAnalyticsEvent', {
    ...getAnalyticsContext(),
    event_type,
    custom_data,
    is_trial_user
  }).catch(() => null);
}