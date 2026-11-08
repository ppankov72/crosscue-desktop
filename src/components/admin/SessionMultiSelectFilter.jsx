import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export default function SessionMultiSelectFilter({
  label,
  options = [],
  selected = [],
  onChange
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const normalizedOptions = (() => {
    const map = new Map();
    for (const opt of options) {
      const val = typeof opt === 'string' ? opt : opt.value;
      const cnt = typeof opt === 'object' && opt !== null ? opt.count : null;
      if (val) map.set(val, cnt);
    }
    for (const sel of selected) {
      if (sel && !map.has(sel)) map.set(sel, 0);
    }
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  })();

  const filteredOptions = normalizedOptions.filter(o =>
    !query.trim() || o.value.toLowerCase().includes(query.trim().toLowerCase())
  );

  const toggleValue = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          selected.length > 0
            ? 'border-amber-400 bg-amber-50 text-amber-900'
            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
        }`}
      >
        <span className="truncate">
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown size={13} className="shrink-0 text-stone-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full rounded-md border border-stone-200 py-1 pl-7 pr-2 text-xs outline-none focus:border-amber-400"
            />
          </div>

          <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] text-stone-500">
            <span>OR logic within field</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className=" inline-flex items-center gap-0.5 font-semibold text-amber-700 hover:text-amber-900"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-stone-50">
            {filteredOptions.length === 0 ? (
              <p className="py-3 text-center text-xs text-stone-400">No options</p>
            ) : (
              filteredOptions.map(({ value, count }) => {
                const isChecked = selected.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                      isChecked ? 'bg-amber-50/80 font-semibold text-stone-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                          isChecked ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={10} />}
                      </span>
                      <span className="truncate">{value}</span>
                    </span>
                    {count !== null && count !== undefined && (
                      <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}