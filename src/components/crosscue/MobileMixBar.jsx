import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Disc3, RotateCcw } from 'lucide-react';
import { audioEngine } from '@/lib/decksmith/audioEngine';

const formatTime = s =>
  `${String(Math.floor(s / 60) || 0).padStart(2, '0')}:${String(Math.floor(s % 60) || 0).padStart(2, '0')}`;

const THUMB_W = 28;

function mapPosToDomain(norm) {
  const raw = -1 + norm * 2;
  if (raw <= -0.92) return -1;
  if (raw >= 0.92) return 1;
  if (Math.abs(raw) <= 0.04) return 0;
  return raw < 0
    ? -((raw - -0.04) / (-0.92 - -0.04))
    : (raw - 0.04) / (0.92 - 0.04);
}

function domainToPos(val) {
  return Math.max(0, Math.min(1, (val + 1) / 2));
}

export default function MobileMixBar({
  deckA,
  deckB,
  cursorA,
  cursorB,
  onToggleA,
  onToggleB,
  cross,
  onCross,
  activeTab,
  onSelectTab,
  autoDJ,
  onResetMix
}) {
  const timeARef = useRef(null);
  const timeBRef = useRef(null);
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [displayCross, setDisplayCross] = useState(cross);
  const [dragging, setDragging] = useState(false);

  // Live elapsed time + autoFade sync without re-rendering full workspace
  useEffect(() => {
    let frame;
    const tick = () => {
      if (timeARef.current && cursorA?.current) {
        timeARef.current.textContent = formatTime(cursorA.current.elapsed || 0);
      }
      if (timeBRef.current && cursorB?.current) {
        timeBRef.current.textContent = formatTime(cursorB.current.elapsed || 0);
      }
      const fade = audioEngine.autoFade;
      if (fade && audioEngine.context) {
        const progress = Math.max(0, Math.min(1, (audioEngine.context.currentTime - fade.startedAt) / fade.seconds));
        const autoPos = fade.from === 'A' ? -1 + progress * 2 : 1 - progress * 2;
        setDisplayCross(autoPos);
      } else if (!isDraggingRef.current) {
        setDisplayCross(cross);
      }
      if (deckA.playing || deckB.playing || audioEngine.autoFade) {
        frame = requestAnimationFrame(tick);
      }
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [deckA.playing, deckB.playing, deckA.elapsed, deckB.elapsed, cross, cursorA, cursorB, autoDJ]);

  const calcCrossFromPointer = useCallback(
    clientX => {
      const el = trackRef.current;
      if (!el) return cross;
      const rect = el.getBoundingClientRect();
      const usable = rect.width - THUMB_W;
      if (usable <= 0) return cross;
      const raw = (clientX - rect.left - THUMB_W / 2) / usable;
      return mapPosToDomain(Math.max(0, Math.min(1, raw)));
    },
    [cross]
  );

  const handlePointerDown = useCallback(
    e => {
      e.preventDefault();
      isDraggingRef.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const val = calcCrossFromPointer(e.clientX);
      setDisplayCross(val);
      onCross(val);
    },
    [calcCrossFromPointer, onCross]
  );

  const handlePointerMove = useCallback(
    e => {
      if (!isDraggingRef.current) return;
      const val = calcCrossFromPointer(e.clientX);
      setDisplayCross(val);
      onCross(val);
    },
    [calcCrossFromPointer, onCross]
  );

  const handlePointerUp = useCallback(
    e => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const val = calcCrossFromPointer(e.clientX);
      setDisplayCross(val);
      onCross(val);
    },
    [calcCrossFromPointer, onCross]
  );

  const normPos = domainToPos(displayCross);
  const blendLabel =
    Math.abs(displayCross) < 0.02
      ? 'CENTER 50/50'
      : displayCross <= -0.98
        ? '100% DECK A'
        : displayCross >= 0.98
          ? '100% DECK B'
          : displayCross < 0
            ? `A ${Math.round(Math.abs(displayCross) * 100)}%`
            : `B ${Math.round(displayCross * 100)}%`;

  return (
    <section
      data-mobile-mix-bar
      aria-label="Mobile Quick Mix Bar"
      className="equipment-panel mb-2.5 rounded border border-[#d4af47]/70 p-2 shadow-md"
    >
      {/* Dual Deck Transport Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Deck A Quick Transport */}
        <div
          className={`flex items-center gap-1.5 rounded border p-1.5 transition ${
            activeTab === 'A'
              ? 'border-[#d4af47] bg-black/45'
              : 'border-[#5b513d]/70 bg-black/25'
          }`}
        >
          <button
            type="button"
            aria-label={deckA.playing ? 'Pause Deck A' : 'Play Deck A'}
            disabled={!deckA.type}
            onClick={onToggleA}
            className={`metal-button deck-transport min-h-[42px] min-w-[46px] shrink-0 px-2.5 ${
              deckA.playing ? 'play-active' : ''
            }`}
          >
            {deckA.playing ? <Pause size={16} /> : <Play size={16} />}
            <span className={`play-led ${deckA.playing ? 'on' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab?.('A')}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-[#d5ad58]">
                <Disc3 size={11} className={deckA.playing ? 'animate-spin' : ''} />
                DECK A
              </span>
              <span
                ref={timeARef}
                className="font-mono text-[11px] font-bold tabular-nums text-[#f1e5cc]"
              >
                {formatTime(deckA.elapsed || 0)}
              </span>
            </div>
            <p className="truncate text-[11px] font-semibold text-[#f1e5cc]">
              {deckA.type ? deckA.name : 'No track'}
            </p>
            <div className="flex items-center justify-between text-[9px] text-[#a49778]">
              <span>{deckA.playing ? '● PLAYING' : deckA.type ? 'READY' : 'EMPTY'}</span>
              {deckA.bpm > 0 && <span className="font-mono">{deckA.bpm.toFixed(1)} BPM</span>}
            </div>
          </button>
        </div>

        {/* Deck B Quick Transport */}
        <div
          className={`flex items-center gap-1.5 rounded border p-1.5 transition ${
            activeTab === 'B'
              ? 'border-[#d4af47] bg-black/45'
              : 'border-[#5b513d]/70 bg-black/25'
          }`}
        >
          <button
            type="button"
            aria-label={deckB.playing ? 'Pause Deck B' : 'Play Deck B'}
            disabled={!deckB.type}
            onClick={onToggleB}
            className={`metal-button deck-transport min-h-[42px] min-w-[46px] shrink-0 px-2.5 ${
              deckB.playing ? 'play-active' : ''
            }`}
          >
            {deckB.playing ? <Pause size={16} /> : <Play size={16} />}
            <span className={`play-led ${deckB.playing ? 'on' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab?.('B')}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-[#d5ad58]">
                <Disc3 size={11} className={deckB.playing ? 'animate-spin' : ''} />
                DECK B
              </span>
              <span
                ref={timeBRef}
                className="font-mono text-[11px] font-bold tabular-nums text-[#f1e5cc]"
              >
                {formatTime(deckB.elapsed || 0)}
              </span>
            </div>
            <p className="truncate text-[11px] font-semibold text-[#f1e5cc]">
              {deckB.type ? deckB.name : 'No track'}
            </p>
            <div className="flex items-center justify-between text-[9px] text-[#a49778]">
              <span>{deckB.playing ? '● PLAYING' : deckB.type ? 'READY' : 'EMPTY'}</span>
              {deckB.bpm > 0 && <span className="font-mono">{deckB.bpm.toFixed(1)} BPM</span>}
            </div>
          </button>
        </div>
      </div>

      {/* Persistent Touch Crossfader Row */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCross(-1)}
          className={`mini-button min-h-[32px] px-2 text-[10px] font-extrabold ${
            displayCross <= -0.98 ? 'vinyl-active' : ''
          }`}
        >
          A
        </button>

        <div className="min-w-0 flex-1">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Mobile Crossfader"
            aria-valuemin={-1}
            aria-valuemax={1}
            aria-valuenow={Number(displayCross.toFixed(2))}
            className="horizontal-crossfader-track h-8"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={() => onCross(0)}
          >
            <div className="horizontal-crossfader-groove" />
            <div
              className={`horizontal-crossfader-thumb ${dragging ? 'active' : ''}`}
              style={{
                width: `${THUMB_W}px`,
                left: `calc(${normPos * 100}% - ${normPos * THUMB_W}px)`
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCross(0)}
          className="mini-button min-h-[32px] px-2 font-mono text-[10px]"
          title="Center Crossfader (50/50)"
        >
          {blendLabel}
        </button>

        <button
          type="button"
          onClick={() => onCross(1)}
          className={`mini-button min-h-[32px] px-2 text-[10px] font-extrabold ${
            displayCross >= 0.98 ? 'vinyl-active' : ''
          }`}
        >
          B
        </button>

        {onResetMix && (
          <button
            type="button"
            onClick={onResetMix}
            title="Reset Mix"
            className="mini-button min-h-[32px] px-2 text-[10px] font-extrabold"
          >
            <RotateCcw size={11} /> RESET
          </button>
        )}
      </div>
    </section>
  );
}