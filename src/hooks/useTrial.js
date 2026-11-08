import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { HEARTBEAT_INTERVAL_SECONDS } from '@/lib/crosscue/trialConfig';

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

export default function useTrial(isPlaying) {
  const [trial, setTrial] = useState(null);
  const [shadowDecision, setShadowDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const installationIdRef = useRef('');
  const isPlayingRef = useRef(false);

  // Initialize trial on mount
  useEffect(() => {
    const installationId = getInstallationId();
    installationIdRef.current = installationId;
    if (!installationId) { setLoading(false); return; }

    base44.functions.invoke('createOrGetTrial', {
      installationId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      language: navigator.language || '',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    })
      .then(res => { setTrial(res.data?.trial || null); setShadowDecision(res.data?.shadowDecision || null); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const sendHeartbeat = async () => {
    try {
      const res = await base44.functions.invoke('trialHeartbeat', {});
      if (res.data?.trial) setTrial(res.data.trial);
      if (res.data?.shadowDecision) setShadowDecision(res.data.shadowDecision);
    } catch {
      // Session was closed (heartbeat_lost, reload, network failure) — restart if still playing
      if (isPlayingRef.current) {
        sessionIdRef.current = null;
        startSession();
      }
    }
  };

  const startSession = async () => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    try {
      const res = await base44.functions.invoke('startTrialSession', {
        installationId: installationIdRef.current,
        page: window.location.pathname,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        language: navigator.language || '',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      });
      if (res.data?.sessionId) {
        sessionIdRef.current = res.data.sessionId;
        if (res.data?.trial) setTrial(res.data.trial);
        if (res.data?.shadowDecision) setShadowDecision(res.data.shadowDecision);
        heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_SECONDS * 1000);
      }
    } catch {}
  };

  const stopSession = async (endReason = 'stopped') => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sid) {
      try {
        const res = await base44.functions.invoke('stopTrialSession', { endReason });
        if (res.data?.trial) setTrial(res.data.trial);
        if (res.data?.shadowDecision) setShadowDecision(res.data.shadowDecision);
      } catch {}
    }
  };

  // Start/stop session based on isPlaying
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying && !sessionIdRef.current) {
      startSession();
    } else if (!isPlaying && sessionIdRef.current) {
      stopSession('stopped');
    }
  }, [isPlaying]);

  // Cleanup on unmount / page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionIdRef.current) {
        // Best effort — may not complete before page closes; heartbeat timeout handles it
        base44.functions.invoke('stopTrialSession', { endReason: 'page_closed' }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Sync heartbeat when tab becomes visible again (background tab throttling protection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionIdRef.current) {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { trial, shadowDecision, loading };
}