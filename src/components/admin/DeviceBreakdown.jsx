const total = (arr) => arr.reduce((sum, item) => sum + item.count, 0) || 1;

function BarGroup({ label, items }) {
  const t = total(items);
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</h4>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => {
          const pct = Math.round((item.count / t) * 100);
          return (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">{item.type}</span>
                <span className="font-bold text-stone-900">{item.count} ({pct}%)</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DeviceBreakdown({ devices }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-900">Устройства и платформи</h3>
      <div className="mt-4 space-y-5">
        <BarGroup label="Устройство" items={devices.device} />
        <BarGroup label="Операционна система" items={devices.os} />
        <BarGroup label="Браузър" items={devices.browser} />
      </div>
    </div>
  );
}