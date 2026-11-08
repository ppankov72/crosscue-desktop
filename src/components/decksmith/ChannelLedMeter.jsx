import { useEffect, useRef, useState } from 'react';
import { effectiveBpm } from '@/lib/decksmith/audioMath';

// 10-segment LED ladder matching the 0-10 fader scale
// Bars 1-8: Green (#39ff14), Bar 9: Yellow (#ffd21a), Bar 10: Red (#ff2800)
const SEGMENTS = [
  { mark: 1, c: '#39ff14', threshold: 0.05 },
  { mark: 2, c: '#39ff14', threshold: 0.15 },
  { mark: 3, c: '#39ff14', threshold: 0.25 },
  { mark: 4, c: '#39ff14', threshold: 0.35 },
  { mark: 5, c: '#39ff14', threshold: 0.45 },
  { mark: 6, c: '#39ff14', threshold: 0.55 },
  { mark: 7, c: '#39ff14', threshold: 0.65 },
  { mark: 8, c: '#39ff14', threshold: 0.75 },
  { mark: 9, c: '#ffd21a', threshold: 0.85 },
  { mark: 10, c: '#ff2800', threshold: 0.95 },
];

export default function ChannelLedMeter({ volume, db, deck }) {
  const [beat, setBeat] = useState(false);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  useEffect(() => {
    if (!deck?.bpm || !deck?.playing) { setBeat(false); return; }
    let frame, last = performance.now(), elapsed = deckRef.current.elapsed || 0, lastSeen = elapsed;
    const tick = now => {
      const d = deckRef.current, dt = (now - last) / 1000; last = now;
      const latest = d.elapsed || 0;
      if (Math.abs(latest - lastSeen) > 0.002) { elapsed = latest; lastSeen = latest; }
      else { elapsed += dt * (d.playbackRate ?? 1); lastSeen = latest; }
      const bpm = effectiveBpm(d);
      if (bpm > 0) { const phase = ((elapsed * bpm / 60) % 1 + 1) % 1; setBeat(phase < 0.18); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [deck?.bpm, deck?.playing]);

  // Determine effective normalized volume [0.0 .. 1.0]
  const effectiveVol = typeof volume === 'number' && Number.isFinite(volume)
    ? Math.max(0, Math.min(1, volume))
    : (typeof deck?.volume === 'number' && Number.isFinite(deck.volume)
      ? Math.max(0, Math.min(1, deck.volume))
      : (db !== undefined && Number.isFinite(db) ? Math.max(0, Math.min(1, 10 ** (db / 20))) : 0));

  // Precise 0..10 bar calibration:
  // - vol <= 0.015: 0 bars (exact zero / mute)
  // - vol >= 0.97: 10 bars (exact full scale / max)
  // - each mark 1..10 turns on its respective segment
  const litCount = effectiveVol <= 0.015
    ? 0
    : effectiveVol >= 0.97
      ? 10
      : Math.min(10, Math.max(1, Math.round(effectiveVol * 10)));

  return (
    <div className="flex h-[84px] flex-col-reverse gap-[2px]" aria-hidden="true">
      {SEGMENTS.map((s, i) => {
        const barNumber = i + 1; // 1 to 10
        const isLit = barNumber <= litCount;
        const isTopActive = barNumber === litCount && isLit;
        const pulse = isTopActive && beat && effectiveVol > 0.05;

        return (
          <span
            key={i}
            className="w-[6px] flex-1 rounded-[1px] transition-colors duration-75"
            style={{
              background: isLit ? s.c : '#15171a',
              boxShadow: isLit
                ? `0 0 ${pulse ? '6px' : '4px'} ${s.c}, inset 0 0 2px ${s.c}`
                : 'inset 0 0 1px #000',
              opacity: isLit ? (pulse ? 1 : 0.92) : 0.4
            }}
          />
        );
      })}
    </div>
  );
}