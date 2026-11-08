// Playback enforcement helpers — application layer above Audio Engine.
// Does NOT modify the Audio Engine; uses its existing setMasterGain API for fade-out.

import { FADE_OUT_SECONDS } from '@/lib/crosscue/trialConfig';

// Gradually fade master gain to 0, then call onStop, then restore gain.
// Returns a cancel function.
export function fadeOutAndStop(audioEngine, currentGain, onStop, durationSeconds = FADE_OUT_SECONDS) {
  if (!audioEngine || typeof audioEngine.setMasterGain !== 'function') {
    onStop();
    return () => {};
  }
  const steps = 20;
  const stepDuration = (durationSeconds * 1000) / steps;
  let step = 0;
  let cancelled = false;

  const interval = setInterval(() => {
    if (cancelled) { clearInterval(interval); return; }
    step++;
    const progress = step / steps;
    const gain = Math.max(0, currentGain * (1 - progress));
    try { audioEngine.setMasterGain(gain); } catch {}
    if (step >= steps) {
      clearInterval(interval);
      if (!cancelled) {
        try { onStop(); } catch {}
        try { audioEngine.setMasterGain(currentGain); } catch {}
      }
    }
  }, stepDuration);

  return () => { cancelled = true; clearInterval(interval); };
}

// Check if a deck is currently producing audio
export function isDeckPlaying(deck) {
  return Boolean(deck?.playing);
}