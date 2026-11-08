import { Plus, Minus } from 'lucide-react';
import VerticalSlider from './VerticalSlider';

const TRACK_H = 104;
const THUMB_H = 13; // must match VerticalSlider's THUMB_H

// Generate vintage tick marks: from +15 down to -15 in steps of 1 (31 ticks total)
// Ticks every 5 steps (+15, +10, +5, 0, -5, -10, -15) are longer. 0 is the center highlight mark.
const TICKS = Array.from({ length: 31 }, (_, i) => {
  const val = 15 - i;
  return {
    val,
    isMajor: val % 5 === 0,
    isCenter: val === 0,
  };
});

// Linear mapping: pos 0 = +15 (top), pos 1 = -15 (bottom)
const pitchToPos = pitch => (15 - pitch) / 30;
const posToPitch = pos => 15 - pos * 30;

// Pixel position of the thumb center for a given pitch value.
const tickCenter = value => pitchToPos(value) * (TRACK_H - THUMB_H) + THUMB_H / 2;

export default function PitchControl({ deck, onChange, onToggleKeyLock }) {
  const reset = () => onChange(0);
  const disabled = deck.type === 'youtube';
  const pos = pitchToPos(deck.pitch ?? 0);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-sm font-bold text-[#e8dec5]">TEMPO</span>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleKeyLock}
          className={`mini-button py-0 px-1 text-[9px] font-bold ${deck.keyLock ? 'vinyl-active text-amber-300' : 'text-stone-400'}`}
          title="KEY LOCK (Master Tempo) — запазва оригиналната тоналност на вокалите и звука при промяна на темпото"
        >
          {deck.keyLock ? '🔒 MT' : 'LOCK'}
        </button>
      </div>
      <div className="flex items-start gap-1">
        <div className="relative" style={{ height: TRACK_H, width: '1.4rem' }}>
          {TICKS.map(t => (
            <div
              key={t.val}
              className={`absolute right-1 transition-all ${
                t.isCenter
                  ? 'h-[2px] w-4 bg-[#ff2800] shadow-[0_0_4px_#ff2800]'
                  : t.isMajor
                  ? 'h-[1.5px] w-3.5 bg-white'
                  : 'h-[1px] w-2 bg-white/60'
              }`}
              style={{ top: tickCenter(t.val), transform: 'translateY(-50%)' }}
            />
          ))}
        </div>
        <VerticalSlider
          value={pos}
          onChange={newPos => onChange(posToPitch(newPos))}
          onReset={reset}
          height={TRACK_H}
          disabled={disabled}
        />
      </div>
      <div className="flex gap-1">
        <button disabled={disabled} className="mini-button" onClick={() => onChange(deck.pitch - .1)}><Minus size={12} /></button>
        <button disabled={disabled} className="mini-button" onClick={() => onChange(deck.pitch + .1)}><Plus size={12} /></button>
      </div>
    </div>
  );
}