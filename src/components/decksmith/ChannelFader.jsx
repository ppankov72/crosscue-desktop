import { useState } from 'react';
import { Activity } from 'lucide-react';
import { gainToDb } from '@/lib/decksmith/audioMath';
import ChannelLedMeter from './ChannelLedMeter';
import VerticalSlider from './VerticalSlider';
import FaderDiagnosticModal from './FaderDiagnosticModal';

// Visual positional marks 10 (top) down to 0 (bottom), matching Pioneer DDJ-200
const marks = [
  { label: '10', pos: 0.0 },
  { label: '9', pos: 0.1 },
  { label: '8', pos: 0.2 },
  { label: '7', pos: 0.3 },
  { label: '6', pos: 0.4 },
  { label: '5', pos: 0.5 },
  { label: '4', pos: 0.6 },
  { label: '3', pos: 0.7 },
  { label: '2', pos: 0.8 },
  { label: '1', pos: 0.9 },
  { label: '0', pos: 1.0 },
];

const TRACK_H = 84;
const THUMB_H = 13; // must match VerticalSlider's THUMB_H
// Pixel position of the thumb center for a given visual position (0..1)
const markCenter = pos => pos * (TRACK_H - THUMB_H) + THUMB_H / 2;

export default function ChannelFader({ id, deck, onChange }) {
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  // Linear volume between 0.0 (bottom, 0) and 1.0 (top, 10), matching MiXXX & Pioneer DDJ-200
  const vol = typeof deck.volume === 'number' && Number.isFinite(deck.volume)
    ? Math.max(0, Math.min(1, deck.volume))
    : (deck.volumeDb !== undefined ? Math.max(0, Math.min(1, Math.pow(10, deck.volumeDb / 20))) : 0.8);
  const pos = 1 - vol; // 0 = top (10), 1 = bottom (0)
  const dbVal = deck.volumeDb ?? gainToDb(vol);

  const handleSliderChange = newPos => {
    let newVol = Math.max(0, Math.min(1, 1 - newPos));
    if (newVol <= 0.015) newVol = 0;
    if (newVol >= 0.985) newVol = 1;
    onChange({ volume: newVol, volumeDb: newVol > 0 ? gainToDb(newVol) : -60 });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <span className="font-mono text-base font-bold text-[#ff2800]">CH {id}</span>
        <button
          onClick={() => setDiagnosticOpen(true)}
          className="text-[#a49778] hover:text-amber-400 p-0.5 rounded transition-colors"
          title={`Отвори симулация и диагностика за CH ${id}`}
        >
          <Activity size={12} />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <VerticalSlider
          value={pos}
          onChange={handleSliderChange}
          onReset={() => handleSliderChange(0)}
          height={TRACK_H}
          disabled={!deck.type}
        />
        <ChannelLedMeter volume={vol} db={dbVal} deck={deck} />
        <div className="relative font-mono text-[11px] font-bold leading-none text-[#a49778]" style={{ height: TRACK_H, width: '1.4rem' }}>
          {marks.map(m => (
            <span
              key={m.label}
              className={`absolute left-0 whitespace-nowrap ${m.label === '10' ? 'text-[#ff2800]' : m.label === '0' ? 'text-[#d5ad58]' : ''}`}
              style={{ top: markCenter(m.pos), transform: 'translateY(-50%)' }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <FaderDiagnosticModal
        open={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        defaultChannel={id}
      />
    </div>
  );
}