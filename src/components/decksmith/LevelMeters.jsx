import { useEffect, useState } from 'react';
import { audioEngine } from '@/lib/decksmith/audioEngine';
import AnalogMeter from './AnalogMeter';

export default function LevelMeters() {
  const [levels, setLevels] = useState({ A: 0, B: 0 });

  useEffect(() => {
    let frameId = null;
    let active = true;

    const tick = () => {
      if (!active) return;
      if (audioEngine.context) {
        const next = audioEngine.levels();
        setLevels(prev => {
          const aChanged = Math.abs(prev.A - next.A) > 0.004 || (next.A === 0 && prev.A !== 0);
          const bChanged = Math.abs(prev.B - next.B) > 0.004 || (next.B === 0 && prev.B !== 0);
          return aChanged || bChanged ? { A: next.A, B: next.B } : prev;
        });
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="mt-3 grid w-full grid-cols-2 gap-6 px-4">
      <AnalogMeter label="A" level={levels.A} />
      <AnalogMeter label="B" level={levels.B} />
    </section>
  );
}