import { useEffect, useRef } from 'react';
import { hasPremiumAccess } from '@/lib/crosscue/freemium';
import { canSendEvent, getAnalyticsContext, sendAnalytics } from '@/lib/marketing/analyticsContext';
import {
  getMetaIntentMixDiagnostics,
  isMixIntentDebugEnabled,
  trackMetaIntentMix30s,
  trackMetaStartMixFree
} from '@/lib/marketing/metaPixel';
import { getStoredConsent } from '@/lib/landing/consentContext';

const INTENT_MIX_THRESHOLD_MS = 30000;

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

/**
 * Observes actual deck playback states for Stage 1 & Stage 2 campaign analytics:
 * 1. StartMix_Free: emitted on first real audio playback in Free Core mode, once per session.
 *    Excludes active Premium Trial and paid entitlements.
 *    - Internal channel requires analytics consent.
 *    - Meta Pixel channel requires marketing consent (independent deduplication).
 * 2. Intent_Mix_30s: emitted when both Deck A and Deck B play audio simultaneously for a
 *    cumulative 30 seconds within the current page load (pauses when either deck stops,
 *    resets on page reload, deduplicated once per session).
 *    - Internal channel requires analytics consent.
 *    - Meta Pixel channel requires marketing consent (independent deduplication).
 */
export default function useMixIntentAnalytics({ deckAPlaying, deckBPlaying, permission, embedded }) {
  const overlapMsRef = useRef(0);
  const lastTickRef = useRef(null);
  const startMixInternalSentRef = useRef(false);
  const startMixMetaSentRef = useRef(false);
  const intentThresholdReachedRef = useRef(false);
  const intentMixInternalSentRef = useRef(false);
  const intentMixMetaSentRef = useRef(false);
  const lastLoggedWholeSecondRef = useRef(0);

  const anyDeckPlaying = Boolean(deckAPlaying || deckBPlaying);
  const bothDecksPlaying = Boolean(deckAPlaying && deckBPlaying);
  const permissionLoading = Boolean(permission?.loading);
  const isFreeCoreMode = !permissionLoading && !hasPremiumAccess(permission);

  // 1. StartMix_Free — first real playback in Free Core mode, once per session (internal + Meta channels)
  useEffect(() => {
    if (embedded || permissionLoading || !anyDeckPlaying || !isFreeCoreMode) return;

    const tryEmitStartMixFree = () => {
      const ctx = getAnalyticsContext();
      const sessionId = ctx.session_id || 'default';

      // Internal analytics channel (requires analytics consent)
      if (!startMixInternalSentRef.current) {
        const internalKey = `crosscue-event-StartMix_Free-${sessionId}`;
        if (hasSessionMarker(internalKey)) {
          startMixInternalSentRef.current = true;
        } else if (canSendEvent('StartMix_Free')) {
          startMixInternalSentRef.current = true;
          setSessionMarker(internalKey);
          sendAnalytics('StartMix_Free', {
            mode: 'free_core',
            deckA: Boolean(deckAPlaying),
            deckB: Boolean(deckBPlaying)
          }, false);
        }
      }

      // Meta Pixel channel (requires marketing consent, independent of internal analytics consent)
      if (!startMixMetaSentRef.current) {
        if (trackMetaStartMixFree({ deckA: Boolean(deckAPlaying), deckB: Boolean(deckBPlaying) })) {
          startMixMetaSentRef.current = true;
        }
      }
    };

    tryEmitStartMixFree();

    const onConsentChanged = () => tryEmitStartMixFree();
    window.addEventListener('crosscue-consent-changed', onConsentChanged);
    return () => window.removeEventListener('crosscue-consent-changed', onConsentChanged);
  }, [embedded, permissionLoading, anyDeckPlaying, isFreeCoreMode, deckAPlaying, deckBPlaying]);

  // 2. Intent_Mix_30s — cumulative 30s of simultaneous Deck A + Deck B playback (internal + Meta channels)
  useEffect(() => {
    if (embedded) return;

    const modeLabel = isFreeCoreMode ? 'free_core' : (permission?.entitlementType || 'unknown');
    const isAnonTrial = Boolean(permission?.isAnonymous && permission?.entitlementType === 'trial');

    const logDebugState = (eventLabel, extra = {}) => {
      if (!isMixIntentDebugEnabled()) return;
      const storedConsent = getStoredConsent();
      const currentCtx = getAnalyticsContext();
      const sessionId = currentCtx.session_id || 'default';
      const internalKey = `crosscue-event-Intent_Mix_30s-${sessionId}`;
      const metaDiag = getMetaIntentMixDiagnostics();
      console.info(`[Intent_Mix_30s Debug] ${eventLabel}`, {
        deckAPlaying: Boolean(deckAPlaying),
        deckBPlaying: Boolean(deckBPlaying),
        bothDecksPlaying: Boolean(bothDecksPlaying),
        overlapMs: Math.round(overlapMsRef.current),
        overlapSeconds: Number((overlapMsRef.current / 1000).toFixed(2)),
        thresholdReached: intentThresholdReachedRef.current || overlapMsRef.current >= INTENT_MIX_THRESHOLD_MS,
        consent: {
          analytics: Boolean(storedConsent?.analytics),
          marketing: Boolean(storedConsent?.marketing)
        },
        markers: {
          internalSessionKey: internalKey,
          internalMarkerExists: hasSessionMarker(internalKey),
          internalSentInMemory: intentMixInternalSentRef.current,
          metaSessionKey: metaDiag.sessionKey,
          metaMarkerExists: metaDiag.sessionMarkerExists,
          metaSentInMemory: intentMixMetaSentRef.current
        },
        metaBlockReason: metaDiag.blockReason,
        ...extra
      });
    };

    const tryEmitIntentMix30s = () => {
      if (!intentThresholdReachedRef.current && overlapMsRef.current < INTENT_MIX_THRESHOLD_MS) return;
      const firstTimeThreshold = !intentThresholdReachedRef.current;
      intentThresholdReachedRef.current = true;

      const currentCtx = getAnalyticsContext();
      const sessionId = currentCtx.session_id || 'default';
      const internalKey = `crosscue-event-Intent_Mix_30s-${sessionId}`;
      const metaDiagBefore = isMixIntentDebugEnabled() ? getMetaIntentMixDiagnostics() : null;

      if (firstTimeThreshold) {
        logDebugState('30s threshold reached — evaluating channels');
      }

      // Internal analytics channel (requires analytics consent)
      let internalOutcome = 'already_sent_in_memory';
      if (!intentMixInternalSentRef.current) {
        if (hasSessionMarker(internalKey)) {
          intentMixInternalSentRef.current = true;
          internalOutcome = 'blocked_by_existing_session_marker';
        } else if (canSendEvent('Intent_Mix_30s')) {
          intentMixInternalSentRef.current = true;
          setSessionMarker(internalKey);
          internalOutcome = 'sent_to_internal_analytics';
          sendAnalytics('Intent_Mix_30s', {
            overlap_seconds: 30,
            mode: modeLabel
          }, isAnonTrial);
        } else {
          internalOutcome = 'blocked_analytics_consent_false';
        }
      }

      // Meta Pixel channel (requires marketing consent, independent of internal analytics consent)
      let metaResult = false;
      let metaOutcome = 'already_sent_in_memory';
      if (!intentMixMetaSentRef.current) {
        metaResult = trackMetaIntentMix30s({ mode: modeLabel });
        if (metaResult) {
          intentMixMetaSentRef.current = true;
          metaOutcome = 'sent_to_meta_pixel';
        } else {
          metaOutcome = metaDiagBefore?.blockReason || 'blocked';
        }
      }

      logDebugState('Channel emission evaluation result', {
        internalOutcome,
        trackMetaIntentMix30sResult: metaResult,
        metaOutcome
      });
    };

    const onConsentChanged = () => {
      logDebugState('Consent changed event received');
      tryEmitIntentMix30s();
    };
    window.addEventListener('crosscue-consent-changed', onConsentChanged);

    logDebugState(bothDecksPlaying ? 'Simultaneous playback active (timer running)' : 'Simultaneous playback paused/inactive');

    if (!bothDecksPlaying) {
      lastTickRef.current = null;
      return () => window.removeEventListener('crosscue-consent-changed', onConsentChanged);
    }

    if (intentMixInternalSentRef.current && intentMixMetaSentRef.current) {
      logDebugState('Both internal and Meta channels already sent in this session');
      return () => window.removeEventListener('crosscue-consent-changed', onConsentChanged);
    }

    lastTickRef.current = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      if (lastTickRef.current !== null) {
        overlapMsRef.current += Math.max(0, now - lastTickRef.current);
      }
      lastTickRef.current = now;

      if (isMixIntentDebugEnabled()) {
        const wholeSeconds = Math.floor(overlapMsRef.current / 1000);
        if (wholeSeconds > lastLoggedWholeSecondRef.current && wholeSeconds <= 30 && (wholeSeconds % 5 === 0 || wholeSeconds === 1 || wholeSeconds === 30)) {
          lastLoggedWholeSecondRef.current = wholeSeconds;
          logDebugState(`Overlap progress: ${wholeSeconds}s / 30s`);
        }
      }

      if (overlapMsRef.current >= INTENT_MIX_THRESHOLD_MS) {
        tryEmitIntentMix30s();
      }
    }, 250);

    return () => {
      window.removeEventListener('crosscue-consent-changed', onConsentChanged);
      if (lastTickRef.current !== null) {
        overlapMsRef.current += Math.max(0, performance.now() - lastTickRef.current);
        lastTickRef.current = null;
      }
      clearInterval(interval);
    };
  }, [embedded, deckAPlaying, deckBPlaying, bothDecksPlaying, isFreeCoreMode, permission?.entitlementType, permission?.isAnonymous]);
}