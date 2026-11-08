import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getAnalyticsContext, sendAnalytics } from '@/lib/marketing/analyticsContext';
import { syncMetaConsentState, trackMetaPageView } from '@/lib/marketing/metaPixel';
import { isTauriDesktop } from '@/lib/crosscue/freemium';

function getInstallationId() {
  const key = 'crosscue-installation-id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem(key, id);
    }
    return id;
  } catch { return 'unknown'; }
}

function getSessionId() {
  const key = 'crosscue-analytics-session';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch { return 'unknown'; }
}

function trafficContext() { return getAnalyticsContext(); }

function getUtmParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || ''
    };
  } catch { return {}; }
}

export function useAnalytics() {
  const trackEvent = useCallback((eventType, customData = {}, isTrialUser = false) => {
    if (isTauriDesktop()) return;
    return sendAnalytics(eventType, customData, isTrialUser);
  }, []);

  return { trackEvent };
}

export function usePageViewTracking() {
  const location = useLocation();
  const installationId = useRef(getInstallationId());
  const sessionId = useRef(getSessionId());
  const utm = useRef(getUtmParams());
  const sessionStartLogged = useRef(false);

  useEffect(() => {
    if (isTauriDesktop()) return;
    const launch = e => {
      const anchor = e.target.closest?.('a[href]');
      if (anchor && new URL(anchor.href, window.location.origin).pathname === '/studio') {
        sendAnalytics('launch_clicked');
      }
    };
    document.addEventListener('click', launch, true);
    return () => document.removeEventListener('click', launch, true);
  }, []);

  const trackCurrentPage = useCallback(() => {
    if (isTauriDesktop()) return;
    if (['/', '/landing'].includes(location.pathname)) {
      sendAnalytics('landing_view');
    }
    if (!sessionStartLogged.current) {
      sessionStartLogged.current = true;
      sendAnalytics('session_start', { page: location.pathname });
    }
    sendAnalytics('pageview', { page: location.pathname });
    trackMetaPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (isTauriDesktop()) return;
    trackCurrentPage();
  }, [trackCurrentPage]);

  useEffect(() => {
    if (isTauriDesktop()) return;
    const onConsentChanged = (e) => {
      syncMetaConsentState(e?.detail);
      if (e?.detail?.analytics) {
        sendAnalytics('pageview', { page: location.pathname, trigger: 'consent_granted' });
      }
      if (e?.detail?.marketing) {
        if (['/', '/landing'].includes(location.pathname)) {
          sendAnalytics('landing_view', { trigger: 'consent_granted' });
        }
        trackMetaPageView(location.pathname);
      }
    };
    window.addEventListener('crosscue-consent-changed', onConsentChanged);
    return () => window.removeEventListener('crosscue-consent-changed', onConsentChanged);
  }, [location.pathname]);
}

export default useAnalytics;