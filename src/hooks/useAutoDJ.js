import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/lib/decksmith/audioEngine';
import { resolveTrackForPlayback, isPlayableTrack } from '@/lib/crosscue/trackResolver';

const playable = isPlayableTrack;
const shuffled = items => { const next = [...items]; for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; } return next; };

export default function useAutoDJ({ enabled, playlists, selectedPlaylist, tracks, decks, transitionStart = 3, crossfadeDuration = 2, crossfaderCurve = 'smooth', queueMode = 'playlist', onEnable, onDisable, onCrossChange, onError }) {
  const config = useRef({}), run = useRef(0), timer = useRef(), finishTimer = useRef(), resetTimer = useRef(), state = useRef({}), snapshot = useRef(null), shuffleMode = useRef(false);
  const [skippedTracks, setSkippedTracks] = useState([]);
  useEffect(() => { config.current = { playlists, selectedPlaylist, tracks, decks, transitionStart, crossfadeDuration, crossfaderCurve, queueMode, onEnable, onDisable, onCrossChange, onError }; }, [playlists, selectedPlaylist, tracks, decks, transitionStart, crossfadeDuration, crossfaderCurve, queueMode, onEnable, onDisable, onCrossChange, onError]);
  const clear = () => { clearTimeout(timer.current); clearTimeout(finishTimer.current); clearTimeout(resetTimer.current); };
  const reportError = msg => config.current.onError?.(msg || 'Track unavailable');
  const getOrderedTracks = () => {
    const playlist = config.current.playlists?.find(item => item.id === config.current.selectedPlaylist);
    if (playlist?.trackIds?.length) {
      const plTracks = playlist.trackIds.map(id => config.current.tracks.find(item => item.id === id)).filter(playable);
      if (plTracks.length) return plTracks;
    }
    const nonSamples = (config.current.tracks || []).filter(t => playable(t) && t.genre !== 'Sample' && !String(t.id || '').startsWith('sample-'));
    if (nonSamples.length) return nonSamples;
    return (config.current.tracks || []).filter(playable);
  };
  const playlistQueue = track => { const ordered = getOrderedTracks(); if (!track) return ordered; const index = ordered.findIndex(item => item.id === track.id); return index < 0 ? [track, ...ordered] : [...ordered.slice(index), ...ordered.slice(0, index)]; };
  const replacePreload = async track => { const current = state.current; if (!current.active || current.transitioning) return false; const inactive = current.active === 'A' ? 'B' : 'A'; try { const resolved = await resolveTrackForPlayback(track); const result = await config.current.decks[inactive].load(resolved); config.current.decks[inactive].setTransport(false); config.current.decks[inactive].setAutoCrossfadeGain(0); current.preloaded = { deck: inactive, track, duration: result?.duration || 0 }; return true; } catch (err) { reportError(err?.message); return false; } };
  const controls = {
    next: async track => { const current = state.current; if (!current.active) { state.current.pendingQueue = [track, ...playlistQueue(track).filter(item => item.id !== track.id)]; config.current.onEnable(); return; } current.queue.splice(current.preloaded ? current.nextIndex - 1 : current.nextIndex, 0, track); if (current.preloaded) await replacePreload(track); },
    append: track => { const current = state.current; if (current.active) current.queue.push(track); else state.current.pendingQueue = [...(state.current.pendingQueue || playlistQueue(track)), track]; },
    top: track => { const current = state.current; if (!current.active) { state.current.pendingQueue = [track, ...(state.current.pendingQueue || playlistQueue(track)).filter(item => item.id !== track.id)]; return; } current.queue.splice(current.nextIndex, 0, track); },
    start: async track => { const queue = playlistQueue(track), current = state.current; if (!current.active) { state.current.pendingQueue = queue; config.current.onEnable(); return; } current.queue = queue; current.nextIndex = 0; if (await replacePreload(queue[0])) current.nextIndex = 1; },
    shuffle: async track => { const current = state.current; if (!current.active) { state.current.pendingQueue = shuffled(state.current.pendingQueue || playlistQueue(track)); return; } const start = current.preloaded ? current.nextIndex - 1 : current.nextIndex, prefix = current.queue.slice(0, start), remaining = shuffled(current.queue.slice(start)); current.queue = [...prefix, ...remaining]; if (current.preloaded && remaining[0]) await replacePreload(remaining[0]); },
    setShuffle: value => { shuffleMode.current = value; if (value && state.current.active) controls.shuffle(); }
  };
  useEffect(() => {
    const runId = ++run.current;
    if (!enabled) { clear(); snapshot.current = null; state.current = { pendingQueue: state.current.pendingQueue }; const position = audioEngine.cancelAutoFade(); if (position !== null) config.current.onCrossChange(position); return; }
    setSkippedTracks([]);
    const getDeck = id => config.current.decks[id];
    let loading = false;
    const failed = (track, error) => {
      const name = track?.name || track?.id || 'Unknown track';
      setSkippedTracks(items => [...items.slice(-9), name]);
      reportError(`Skipped ${name}: ${error?.message || 'Track unavailable'}`);
    };
    const preload = async () => {
      if (loading || run.current !== runId) return false;
      loading = true;
      let consecutive = 0;
      let attempts = 0;
      const total = state.current.queue?.length || 0;
      try {
        while (attempts < total && run.current === runId) {
          if (state.current.nextIndex >= total) state.current.nextIndex = 0;
          const next = state.current.queue[state.current.nextIndex++];
          attempts++;
          if (!playable(next)) { failed(next); continue; }
          const inactive = state.current.active === 'A' ? 'B' : 'A';
          try {
            const resolved = await resolveTrackForPlayback(next);
            if (run.current !== runId) return false;
            const result = await getDeck(inactive).load(resolved);
            if (run.current !== runId) return false;
            const duration = result?.duration || getDeck(inactive).deck.duration || 0;
            if (!duration) throw new Error('No playable audio');
            getDeck(inactive).setTransport(false);
            getDeck(inactive).setAutoCrossfadeGain(0);
            state.current.preloaded = { deck: inactive, track: next, duration };
            return true;
          } catch (error) {
            if (run.current !== runId) return false;
            getDeck(inactive).eject();
            failed(next, error);
            consecutive++;
            // Bound synchronous failure bursts without stopping a queue that still has playable tracks.
            if (consecutive >= 3) { consecutive = 0; await new Promise(resolve => setTimeout(resolve, 0)); }
          }
        }
        return false;
      } finally { loading = false; }
    };
    const scheduleTransition = () => {
      clearTimeout(timer.current);
      const check = () => {
        if (run.current !== runId || state.current.transitioning || !state.current.active) return;
        if (!state.current.preloaded) { timer.current = setTimeout(check, 250); return; }
        const activeDeck = getDeck(state.current.active);
        const remaining = state.current.activeDuration - activeDeck.cursor.current.elapsed;
        if (remaining <= config.current.transitionStart || !activeDeck.cursor.current.playing) { transition(); return; }
        timer.current = setTimeout(check, 250);
      };
      check();
    };
    const finishTransition = async () => {
      if (run.current !== runId || !state.current.transitioning) return;
      clearTimeout(resetTimer.current);
      const { from, to } = state.current.transitioning;
      const nextDuration = state.current.preloaded?.duration || getDeck(to).deck.duration;
      getDeck(from).setTransport(false);
      getDeck(from).eject(); // releases File/PCM references and clears the worklet buffer
      state.current.active = to;
      state.current.activeDuration = nextDuration;
      state.current.preloaded = null;
      state.current.transitioning = false;
      if (!(await preload()) && run.current === runId) config.current.onDisable();
      else if (run.current === runId) scheduleTransition();
    };
    const transition = () => {
      if (state.current.transitioning || !state.current.preloaded) return;
      const from = state.current.active, to = state.current.preloaded.deck, duration = config.current.crossfadeDuration;
      state.current.transitioning = { from, to, endsAt: Date.now() + duration * 1000 };
      getDeck(to).setTransport(true);
      audioEngine.scheduleAutoCrossfade(from, to, duration);
      getDeck(from).setAutoCrossfadeGain(0, duration, config.current.crossfaderCurve);
      getDeck(to).setAutoCrossfadeGain(1, duration, config.current.crossfaderCurve);
      finishTimer.current = setTimeout(() => { if (run.current === runId) config.current.onCrossChange(to === 'A' ? -1 : 1); }, duration * 1000);
      resetTimer.current = setTimeout(finishTransition, duration * 1000);
    };
    const restore = () => {
      if (document.hidden || run.current !== runId || !state.current.active) return;
      if (state.current.transitioning) {
        const remaining = state.current.transitioning.endsAt - Date.now();
        if (remaining <= 0) { clearTimeout(finishTimer.current); config.current.onCrossChange(state.current.transitioning.to === 'A' ? -1 : 1); finishTransition(); }
        else { clearTimeout(resetTimer.current); resetTimer.current = setTimeout(finishTransition, remaining); }
        return;
      }
      // The live state is authoritative if it advanced while backgrounded; the snapshot
      // only restores state if a paused/throttled callback left it empty.
      if (!state.current.queue?.length && snapshot.current) state.current = { ...snapshot.current, queue: [...snapshot.current.queue] };
      if (!state.current.preloaded && !loading) preload().then(ok => { if (ok && run.current === runId) scheduleTransition(); });
      else scheduleTransition();
    };
    const onVisibility = () => {
      if (document.hidden) snapshot.current = { ...state.current, queue: [...(state.current.queue || [])] };
      else restore();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', restore);
    window.addEventListener('online', restore);
    const start = async () => {
      const ordered = (state.current.pendingQueue || getOrderedTracks()).filter(playable),
        queue = (config.current.queueMode === 'shuffle' || shuffleMode.current) ? shuffled(ordered) : ordered;
      state.current.pendingQueue = null;
      if (!queue.length) { reportError('No playable tracks available for Auto DJ'); config.current.onDisable(); return; }
      const currentA = getDeck('A').deck, currentB = getDeck('B').deck;
      if (currentA.playing && currentB.playing) {
        getDeck('A').setTransport(false);
      }
      let active = currentB.playing ? 'B' : currentA.playing ? 'A' : (currentB.duration ? 'B' : 'A');
      let current = getDeck(active).deck;
      let index = queue.findIndex(track => track.id === current.trackId);
      let activeDuration = current.duration;
      if (index < 0 && !current.playing) {
        active = 'A'; current = getDeck(active).deck; index = 0;
        let loaded = false;
        while (index < queue.length && !loaded && run.current === runId) {
          const next = queue[index];
          try {
            const resolved = await resolveTrackForPlayback(next);
            const result = await getDeck(active).load(resolved);
            if (run.current !== runId) return;
            activeDuration = result?.duration || 0;
            if (!activeDuration) throw new Error('No playable audio');
            loaded = true;
          } catch (error) { getDeck(active).eject(); failed(next, error); index++; if (index % 3 === 0) await new Promise(resolve => setTimeout(resolve, 0)); }
        }
        if (!loaded) { if (run.current === runId) config.current.onDisable(); return; }
      }
      if (!activeDuration || run.current !== runId) { if (run.current === runId) config.current.onDisable(); return; }
      if (!current.playing) getDeck(active).setTransport(true);
      const nextIdx = index < 0 ? 0 : (index + 1) % queue.length;
      state.current = { queue, active, activeDuration, nextIndex: nextIdx, preloaded: null, transitioning: false };
      audioEngine.setAutoCrossfadeActive(active);
      getDeck('A').setAutoCrossfadeGain(active === 'A' ? 1 : 0);
      getDeck('B').setAutoCrossfadeGain(active === 'B' ? 1 : 0);
      config.current.onCrossChange(active === 'A' ? -1 : 1);
      if (!(await preload()) || run.current !== runId) { if (run.current === runId) config.current.onDisable(); return; }
      scheduleTransition();
    };
    start();
    return () => { clear(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', restore); window.removeEventListener('online', restore); };
  }, [enabled]);
  return { ...controls, skippedTracks };
}