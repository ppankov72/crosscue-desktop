import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { isTauriDesktop } from '@/lib/crosscue/freemium';
import {
  TRIAL_VALIDATION_INTERVAL_SECONDS,
  NETWORK_GRACE_SECONDS,
  HEARTBEAT_INTERVAL_SECONDS,
  TRIAL_LIMIT_SECONDS,
  TRIAL_EXPIRY_GRACE_SECONDS
} from '@/lib/crosscue/trialConfig';

function getInstallationId() {
  const key = 'crosscue-installation-id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
      localStorage.setItem(key, id);
    }
    return id;
  } catch { return ''; }
}

export default function usePlaybackPermission({ isPlaying, onLock }) {
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockState, setLockState] = useState('unlocked');
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(NETWORK_GRACE_SECONDS);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [djNickname, setDjNickname] = useState('');
  const [trialToken, setTrialToken] = useState('');
  const [trialExpired, setTrialExpired] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const sessionIdRef = useRef(null);
  const validationRef = useRef(null);
  const graceRef = useRef(null);
  const installationIdRef = useRef('');
  const isPlayingRef = useRef(false);
  const onLockRef = useRef(onLock);
  const fadeCancelRef = useRef(null);
  const allowedRef = useRef(null);
  const lockStateRef = useRef('unlocked');
  const isAnonymousRef = useRef(false);
  const trialTokenRef = useRef('');
  const anonHeartbeatRef = useRef(null);
  const expiryGraceRef = useRef(null);
  const expiryGraceStartedRef = useRef(false);

  useEffect(() => { onLockRef.current = onLock; }, [onLock]);
  useEffect(() => { lockStateRef.current = lockState; }, [lockState]);

  // Desktop shortcut: skip all Base44 calls
  useEffect(() => {
    if (isTauriDesktop()) {
      setPermission({
        allowed: true,
        entitlementType: 'premium',
        reason: 'desktop',
        remainingSeconds: 999999
      });
      allowedRef.current = true;
      setLockState('unlocked');
      setLoading(false);
      return;
    }
  }, []);

  const fetchPermission = useCallback(async () => {
    if (isTauriDesktop() || isAnonymousRef.current) return null;
    try {
      const res = await base44.functions.invoke('getPlaybackPermission', {});
      const data = res.data;
      if (data && !data.error) {
        setPermission(data);
        allowedRef.current = data.allowed;
        if (data.allowed) {
          setLockState('unlocked');
          setGraceSecondsLeft(NETWORK_GRACE_SECONDS);
          if (fadeCancelRef.current) { fadeCancelRef.current(); fadeCancelRef.current = null; }
        } else {
          setLockState('locked');
        }
        return data;
      }
    } catch {
      if (isPlayingRef.current && lockStateRef.current !== 'locked') {
        startGracePeriod();
      }
    }
    return null;
  }, []);

  const startGracePeriod = useCallback(() => {
    if (isTauriDesktop() || isAnonymousRef.current || graceRef.current) return;
    setLockState('grace');
    lockStateRef.current = 'grace';
    let secondsLeft = NETWORK_GRACE_SECONDS;
    setGraceSecondsLeft(secondsLeft);
    graceRef.current = setInterval(() => {
      secondsLeft -= 1;
      setGraceSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(graceRef.current);
        graceRef.current = null;
        triggerLock('network_lost');
      }
    }, 1000);
  }, []);

  const triggerLock = useCallback((reason) => {
    if (isTauriDesktop()) return;
    setLockState('locked');
    lockStateRef.current = 'locked';
    allowedRef.current = false;
    if (graceRef.current) { clearInterval(graceRef.current); graceRef.current = null; }
    if (anonHeartbeatRef.current) { clearInterval(anonHeartbeatRef.current); anonHeartbeatRef.current = null; }
    if (onLockRef.current && isPlayingRef.current) {
      if (fadeCancelRef.current) fadeCancelRef.current();
      fadeCancelRef.current = onLockRef.current(reason);
    }
  }, []);

  const retry = useCallback(async () => {
    if (isTauriDesktop()) return { allowed: true };
    setLockState('unlocked');
    lockStateRef.current = 'unlocked';
    const data = await fetchPermission();
    return data;
  }, [fetchPermission]);

  const initAnonymous = useCallback(async (token) => {
    if (isTauriDesktop()) return;
    if (!token) {
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }
    try {
      const res = await base44.functions.invoke('getTrialProfile', { trialToken: token });
      const data = res.data;
      if (data?.notFound) {
        localStorage.removeItem('crosscue-trial-token');
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }
      trialTokenRef.current = data.trialToken;
      setTrialToken(data.trialToken);
      setDjNickname(data.djNickname || '');
      setFeedbackSubmitted(Boolean(data.feedbackSubmitted));
      const remaining = data.remainingSeconds ?? 0;
      const expired = remaining <= 0 || data.status === 'expired';
      setPermission({
        allowed: !expired,
        entitlementType: 'trial',
        reason: expired ? 'trial_expired' : 'trial_active',
        remainingSeconds: remaining
      });
      allowedRef.current = !expired;
      if (expired) setTrialExpired(true);
      setLoading(false);
    } catch {
      setNeedsOnboarding(true);
      setLoading(false);
    }
  }, []);

  const completeOnboarding = useCallback((data) => {
    if (isTauriDesktop()) return;
    trialTokenRef.current = data.trialToken;
    setTrialToken(data.trialToken);
    setDjNickname(data.djNickname || '');
    setFeedbackSubmitted(false);
    setNeedsOnboarding(false);
    setTrialExpired(false);
    setPermission({
      allowed: true,
      entitlementType: 'trial',
      reason: 'trial_active',
      remainingSeconds: data.remainingSeconds ?? TRIAL_LIMIT_SECONDS
    });
    allowedRef.current = true;
    setLockState('unlocked');
    lockStateRef.current = 'unlocked';
  }, []);

  const markFeedbackSubmitted = useCallback(() => setFeedbackSubmitted(true), []);

  const startExpiryGrace = useCallback(() => {
    if (isTauriDesktop() || expiryGraceStartedRef.current) return;
    expiryGraceStartedRef.current = true;
    setTrialExpired(true);
    if (anonHeartbeatRef.current) { clearInterval(anonHeartbeatRef.current); anonHeartbeatRef.current = null; }
    base44.functions.invoke('trialProfileHeartbeat', { trialToken: trialTokenRef.current, playbackActive: false, endReason: 'trial_expired' }).catch(() => {});
    let secondsLeft = TRIAL_EXPIRY_GRACE_SECONDS;
    expiryGraceRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(expiryGraceRef.current);
        expiryGraceRef.current = null;
        triggerLock('trial_expired');
      }
    }, 1000);
  }, [triggerLock]);

  const sendAnonymousHeartbeat = useCallback(async (playbackActive) => {
    if (isTauriDesktop() || !trialTokenRef.current) return;
    try {
      const res = await base44.functions.invoke('trialProfileHeartbeat', {
        trialToken: trialTokenRef.current,
        playbackActive,
        page: window.location.pathname,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        language: navigator.language || '',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      });
      const data = res.data;
      if (data && !data.error) {
        const remaining = data.remainingSeconds ?? 0;
        setPermission(prev => prev ? { ...prev, allowed: data.allowed, remainingSeconds: remaining, reason: data.reason } : prev);
        if (!data.allowed && remaining <= 0 && playbackActive) {
          startExpiryGrace();
        }
      }
    } catch {}
  }, [startExpiryGrace]);

  // Initialize (web only)
  useEffect(() => {
    if (isTauriDesktop()) return;
    let cancelled = false;
    base44.auth.isAuthenticated().then(authed => {
      if (cancelled) return;
      if (!authed) {
        isAnonymousRef.current = true;
        setIsAnonymous(true);
        const token = localStorage.getItem('crosscue-trial-token') || '';
        const nick = localStorage.getItem('crosscue-trial-nickname') || '';
        setDjNickname(nick);
        initAnonymous(token);
        return;
      }
      const installationId = getInstallationId();
      installationIdRef.current = installationId;
      if (!installationId) { setLoading(false); return; }
      base44.functions.invoke('createOrGetTrial', {
        installationId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        language: navigator.language || '',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      }).catch(() => {}).finally(() => {
        fetchPermission().finally(() => setLoading(false));
      });
    }).catch(() => {
      if (cancelled) return;
      isAnonymousRef.current = true;
      setIsAnonymous(true);
      initAnonymous(localStorage.getItem('crosscue-trial-token') || '');
    });
    return () => { cancelled = true; };
  }, [fetchPermission, initAnonymous]);

  useEffect(() => {
    if (isTauriDesktop()) return;
    isPlayingRef.current = isPlaying;
    if (isAnonymousRef.current) {
      if (needsOnboarding) return;
      if (!isPlaying) {
        if (anonHeartbeatRef.current) { clearInterval(anonHeartbeatRef.current); anonHeartbeatRef.current = null; }
        if (trialTokenRef.current) sendAnonymousHeartbeat(false);
        if (lockStateRef.current === 'grace') { setLockState('unlocked'); lockStateRef.current = 'unlocked'; }
        return;
      }
      if (allowedRef.current === false && !expiryGraceStartedRef.current) {
        setTrialExpired(true);
        return;
      }
      if (expiryGraceStartedRef.current) return;
      sendAnonymousHeartbeat(true);
      if (anonHeartbeatRef.current) clearInterval(anonHeartbeatRef.current);
      anonHeartbeatRef.current = setInterval(() => sendAnonymousHeartbeat(true), HEARTBEAT_INTERVAL_SECONDS * 1000);
      return;
    }

    if (!isPlaying) {
      if (validationRef.current) { clearInterval(validationRef.current); validationRef.current = null; }
      if (graceRef.current) { clearInterval(graceRef.current); graceRef.current = null; }
      if (lockStateRef.current === 'grace') { setLockState('unlocked'); lockStateRef.current = 'unlocked'; }
      if (sessionIdRef.current) {
        sessionIdRef.current = null;
        base44.functions.invoke('stopTrialSession', { endReason: 'stopped' }).catch(() => {});
      }
      return;
    }
    if (allowedRef.current === false) {
      triggerLock('permission_denied');
      return;
    }
    base44.functions.invoke('startTrialSession', {
      installationId: installationIdRef.current,
      page: window.location.pathname,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      language: navigator.language || '',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    }).then(res => {
      if (res.data?.sessionId) sessionIdRef.current = res.data.sessionId;
    }).catch(() => {});
    if (validationRef.current) clearInterval(validationRef.current);
    validationRef.current = setInterval(() => {
      fetchPermission();
    }, TRIAL_VALIDATION_INTERVAL_SECONDS * 1000);
  }, [isPlaying, fetchPermission, triggerLock, needsOnboarding, sendAnonymousHeartbeat]);

  useEffect(() => {
    if (isTauriDesktop() || isAnonymousRef.current || !isPlaying) return;
    const heartbeatInterval = setInterval(() => {
      base44.functions.invoke('trialHeartbeat', {}).catch(() => {});
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
    return () => clearInterval(heartbeatInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (isTauriDesktop()) return;
    const handleBeforeUnload = () => {
      if (validationRef.current) clearInterval(validationRef.current);
      if (graceRef.current) clearInterval(graceRef.current);
      if (anonHeartbeatRef.current) clearInterval(anonHeartbeatRef.current);
      if (expiryGraceRef.current) clearInterval(expiryGraceRef.current);
      if (isAnonymousRef.current && trialTokenRef.current) {
        base44.functions.invoke('trialProfileHeartbeat', { trialToken: trialTokenRef.current, playbackActive: false, endReason: 'page_closed' }).catch(() => {});
      } else if (sessionIdRef.current) {
        base44.functions.invoke('stopTrialSession', { endReason: 'page_closed' }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (validationRef.current) clearInterval(validationRef.current);
      if (graceRef.current) clearInterval(graceRef.current);
      if (anonHeartbeatRef.current) clearInterval(anonHeartbeatRef.current);
      if (expiryGraceRef.current) clearInterval(expiryGraceRef.current);
      if (fadeCancelRef.current) fadeCancelRef.current();
    };
  }, []);

  useEffect(() => {
    if (isTauriDesktop()) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isAnonymousRef.current && trialTokenRef.current) sendAnonymousHeartbeat(isPlayingRef.current);
        else fetchPermission();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPermission, sendAnonymousHeartbeat]);

  useEffect(() => {
    if (isTauriDesktop()) return;
    if (permission && !permission.allowed && isPlaying && lockStateRef.current !== 'locked' && !expiryGraceStartedRef.current) {
      if (isAnonymousRef.current) {
        if (permission.reason === 'trial_expired' || (permission.remainingSeconds ?? 0) <= 0) {
          startExpiryGrace();
        } else {
          triggerLock(permission.reason || 'permission_denied');
        }
      } else {
        triggerLock(permission.reason || 'permission_denied');
      }
    }
  }, [permission, isPlaying, triggerLock, startExpiryGrace]);

  return {
    permission,
    loading,
    allowed: lockState !== 'locked' && (permission?.allowed ?? true),
    entitlementType: permission?.entitlementType || 'none',
    reason: permission?.reason || '',
    remainingSeconds: permission?.remainingSeconds ?? -1,
    lockState,
    graceSecondsLeft,
    retry,
    isAnonymous,
    needsOnboarding,
    djNickname,
    trialToken,
    trialExpired,
    feedbackSubmitted,
    completeOnboarding,
    markFeedbackSubmitted
  };
}