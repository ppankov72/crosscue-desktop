import { useEffect, useRef } from 'react';

const marks = ['-20', '-10', '-7', '-5', '-3', '-2', '-1', '0', '+1', '+2', '+3'];

const point = (angle, radius) => {
  const radians = (angle * Math.PI) / 180;
  return { x: 250 + Math.sin(radians) * radius, y: 150 - Math.cos(radians) * radius };
};

export default function AnalogMeter({ level = 0, label, compact }) {
  const targetRef = useRef(level);
  const currentAngleRef = useRef(-62);
  const needleRef = useRef(null);

  useEffect(() => {
    targetRef.current = Number.isFinite(level) ? level : 0;
  }, [level]);

  useEffect(() => {
    let frameId = null;
    let active = true;

    const tick = () => {
      if (!active) return;
      const clamped = Math.max(0, Math.min(1, targetRef.current || 0));
      const next = -62 + clamped * 124;
      const current = currentAngleRef.current;
      const diff = next - current;

      if (Math.abs(diff) > 0.02) {
        const updated = current + diff * (next > current ? 0.2 : 0.055);
        currentAngleRef.current = updated;
        if (needleRef.current) {
          needleRef.current.setAttribute('transform', `rotate(${updated.toFixed(2)} 250 150)`);
        }
      } else if (current !== next) {
        currentAngleRef.current = next;
        if (needleRef.current) {
          needleRef.current.setAttribute('transform', `rotate(${next.toFixed(2)} 250 150)`);
        }
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
    <div className={`vu-meter${compact ? ' vu-meter-compact' : ''}`}>
      <svg viewBox="0 0 500 190" aria-label={`VU ${label} meter`}>
        <rect className="vu-face" x="8" y="8" width="484" height="174" rx="3" />
        <path className="vu-overload-arc" d="M 303 36 A 120 120 0 0 1 356 94" />
        <path className="vu-arc" d="M 144 94 A 120 120 0 0 1 356 94" />
        {Array.from({ length: 41 }, (_, i) => {
          const angle = -62 + i * 3.1;
          const outer = point(angle, 120);
          const inner = point(angle, i % 4 === 0 ? 108 : 114);
          return (
            <line
              key={i}
              className={i >= 28 ? 'vu-minor-overload' : 'vu-minor'}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
            />
          );
        })}
        {marks.map((mark, index) => {
          const angle = -62 + index * 12.4;
          const labelPoint = point(angle, 137);
          return (
            <text
              key={mark}
              className={index > 7 ? 'vu-overload' : index === 7 ? 'vu-zero' : ''}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {mark}
            </text>
          );
        })}
        <line
          ref={needleRef}
          className="vu-needle"
          x1="250"
          y1="150"
          x2="250"
          y2="33"
          transform="rotate(-62 250 150)"
        />
        <circle className="vu-pivot" cx="250" cy="150" r="6" />
        <text className="vu-reference" x="250" y="172" textAnchor="middle">
          0 VU = REF
        </text>
      </svg>
      <div className="vu-label">VU {label}</div>
      <div className="vu-db">dB</div>
    </div>
  );
}