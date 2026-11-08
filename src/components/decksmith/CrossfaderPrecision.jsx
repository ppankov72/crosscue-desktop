import { useEffect, useState, useRef, useCallback } from 'react';
import { audioEngine } from '@/lib/decksmith/audioEngine';

const THUMB_W = 26; // width in px of .horizontal-crossfader-thumb

/**
 * Maps normalized 0..1 position across track to crossfader value [-1..1]
 * with dedicated end-stop deadzones and center detent.
 */
function mapPosToDomain(norm) {
  const raw = -1 + norm * 2;
  // Dead-zone end stops: guarantees reaching 100% A (-1.0) and 100% B (+1.0)
  if (raw <= -0.92) return -1;
  if (raw >= 0.92) return 1;
  if (Math.abs(raw) <= 0.035) return 0;

  // Smooth linear scale between dead-zones
  if (raw < 0) {
    const t = (raw - (-0.035)) / (-0.92 - (-0.035));
    return -t;
  } else {
    const t = (raw - 0.035) / (0.92 - 0.035);
    return t;
  }
}

function domainToPos(val) {
  return Math.max(0, Math.min(1, (val + 1) / 2));
}

export default function CrossfaderPrecision({ position, onChange, autoDJ }) {
  const [displayPosition, setDisplayPosition] = useState(position);
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let frame;
    const tick = () => {
      const fade = audioEngine.autoFade;
      if (fade) {
        const progress = Math.max(0, Math.min(1, (audioEngine.context.currentTime - fade.startedAt) / fade.seconds));
        const autoPos = fade.from === 'A' ? -1 + progress * 2 : 1 - progress * 2;
        setDisplayPosition(autoPos);
      } else if (!isDraggingRef.current) {
        setDisplayPosition(position);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [position, autoDJ]);

  const calcValueFromPointer = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return position;
    const rect = track.getBoundingClientRect();
    const usable = rect.width - THUMB_W;
    if (usable <= 0) return position;
    const raw = (clientX - rect.left - THUMB_W / 2) / usable;
    const clampedNorm = Math.max(0, Math.min(1, raw));
    return mapPosToDomain(clampedNorm);
  }, [position]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const val = calcValueFromPointer(e.clientX);
    setDisplayPosition(val);
    onChange(val);
  }, [calcValueFromPointer, onChange]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const val = calcValueFromPointer(e.clientX);
    setDisplayPosition(val);
    onChange(val);
  }, [calcValueFromPointer, onChange]);

  const handlePointerUp = useCallback((e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const val = calcValueFromPointer(e.clientX);
      setDisplayPosition(val);
      onChange(val);
    }
  }, [calcValueFromPointer, onChange]);

  const handleKeyDown = (e) => {
    const step = e.shiftKey ? 0.005 : 0.02;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(-1, displayPosition - step);
      onChange(next <= -0.92 ? -1 : next);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(1, displayPosition + step);
      onChange(next >= 0.92 ? 1 : next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(-1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(1);
    }
  };

  const normPos = domainToPos(displayPosition);

  const measurement = Math.abs(displayPosition) < 0.005
    ? '0 · CENTER'
    : displayPosition > 0
      ? `+${displayPosition.toFixed(2)} · B ${Math.round(displayPosition * 100)}%`
      : `${displayPosition.toFixed(2)} · A ${Math.round(Math.abs(displayPosition) * 100)}%`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={`text-[10px] font-bold tracking-widest ${autoDJ ? 'text-[#d5ad58]' : 'text-[#e8dec5]'}`}>
          CROSSFADER{autoDJ ? ' · AUTO' : ''}
        </label>
        <span className="font-mono text-[9px] text-[#a49778]">
          {displayPosition <= -0.99 ? 'DECK A ONLY' : displayPosition >= 0.99 ? 'DECK B ONLY' : 'BLEND'}
        </span>
      </div>

      <div
        ref={trackRef}
        tabIndex={0}
        role="slider"
        aria-label="Crossfader position"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={Number(displayPosition.toFixed(2))}
        className="horizontal-crossfader-track mt-1.5"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => onChange(0)}
        onKeyDown={handleKeyDown}
      >
        <div className="horizontal-crossfader-groove" />
        <div
          className={`horizontal-crossfader-thumb ${isDragging ? 'active' : ''}`}
          style={{
            left: `calc(${normPos * 100}% - ${normPos * THUMB_W}px)`,
          }}
        />
      </div>

      <div className="mt-1 flex items-end gap-1 select-none">
        <button
          type="button"
          onClick={() => onChange(-1)}
          className={`text-[10px] font-bold leading-none transition-colors px-1 py-0.5 rounded cursor-pointer ${
            displayPosition <= -0.99 ? 'text-[#d5ad58] bg-[#292722]' : 'text-white hover:text-[#d5ad58]'
          }`}
          title="Превключи изцяло на Deck A (100%)"
        >
          A 100
        </button>
        <div
          className="flex flex-1 items-end justify-between px-1 cursor-pointer"
          title="Кликни по скалата или двойно за Център"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onChange(mapPosToDomain(ratio));
          }}
        >
          {Array.from({ length: 21 }, (_, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: '1px',
                background: i === 10 ? '#d5ad58' : '#fff',
                height: i === 10 ? 12 : i % 2 === 0 ? 10 : 5,
                opacity: i === 10 ? 1 : 0.8
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(1)}
          className={`text-[10px] font-bold leading-none transition-colors px-1 py-0.5 rounded cursor-pointer ${
            displayPosition >= 0.99 ? 'text-[#d5ad58] bg-[#292722]' : 'text-white hover:text-[#d5ad58]'
          }`}
          title="Превключи изцяло на Deck B (100%)"
        >
          100 B
        </button>
      </div>

      <div className="mt-1 flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(-1, (displayPosition || 0) - 0.02);
            onChange(next <= -0.92 ? -1 : next);
          }}
          className="mini-button px-2 py-0.5 text-[10px] leading-none"
          title="Фина настройка към Deck A (-2%)"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="font-mono text-[10px] font-bold tracking-wider text-white hover:text-[#d5ad58] transition-colors cursor-pointer px-1 py-0.5 rounded"
          title="Двойно кликване или клик за връщане в центъра (0 · CENTER)"
        >
          {measurement}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = Math.min(1, (displayPosition || 0) + 0.02);
            onChange(next >= 0.92 ? 1 : next);
          }}
          className="mini-button px-2 py-0.5 text-[10px] leading-none"
          title="Фина настройка към Deck B (+2%)"
        >
          ▶
        </button>
      </div>
    </div>
  );
}