import { useEffect, useState, useRef } from 'react';
import { audioEngine } from '@/lib/decksmith/audioEngine';
import AnalogMeter from './AnalogMeter';

export default function DeckMeter({ deckId }) {
  const [levelL, setLevelL] = useState(0);
  const [levelR, setLevelR] = useState(0);
  const lastUpdate = useRef(0);

  useEffect(() => {
    let frameId = null;
    let active = true;

    const tick = () => {
      if (!active) return;
      const now = performance.now();
      if (now - lastUpdate.current > 100 && audioEngine.context) {
        const levels = audioEngine.levels();
        const nextL = levels[`${deckId}_L`] ?? levels[deckId] ?? 0;
        const nextR = levels[`${deckId}_R`] ?? levels[deckId] ?? 0;
        setLevelL(nextL);
        setLevelR(nextR);
        lastUpdate.current = now;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [deckId]);

  return (
    <div className="flex w-full gap-1">
      <div className="min-w-0 flex-1"><AnalogMeter level={levelL} label="L" compact /></div>
      <div className="min-w-0 flex-1"><AnalogMeter level={levelR} label="R" compact /></div>
    </div>
  );
}