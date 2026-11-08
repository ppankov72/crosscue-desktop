const turns = Math.PI * 14;
const markerProgress = 0.72;
const pointAt = progress => {
  const angle = -Math.PI / 2 + progress * turns;
  const radius = 20 + progress * 25;
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
};
const points = Array.from({ length: 481 }, (_, index) => {
  const point = pointAt(index / 480);
  return `${point.x},${point.y}`;
}).join(' ');
const marker = pointAt(markerProgress);

export default function VinylSpiral() {
  return <svg aria-hidden="true" viewBox="0 0 100 100" className="vinyl-spiral pointer-events-none absolute inset-0 h-full w-full"><polyline points={points} fill="none" stroke="#d7bd68" strokeWidth=".65" strokeLinecap="round" strokeLinejoin="round"/><circle cx={marker.x} cy={marker.y} r="2.4" fill="#e5c765"/><circle cx={marker.x} cy={marker.y} r=".7" fill="#fff7d6"/></svg>;
}