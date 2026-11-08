import { Calendar, Search, RotateCcw, X } from 'lucide-react';
import SessionMultiSelectFilter from '@/components/admin/SessionMultiSelectFilter';

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' }
];

const FILTER_FIELDS = [
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'device', label: 'Device' },
  { key: 'os', label: 'OS' },
  { key: 'browser', label: 'Browser' },
  { key: 'page', label: 'Page' },
  { key: 'user', label: 'User' },
  { key: 'traffic_source', label: 'Traffic Source' }
];

export default function SessionFiltersBar({
  datePreset,
  startDate,
  endDate,
  onDatePresetChange,
  onCustomDateChange,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  facets = {},
  hasActiveFilters
}) {
  const userOptions = (() => {
    const base = [
      { value: 'anonymous', count: null },
      { value: 'authenticated', count: null }
    ];
    const fromFacets = facets.user || [];
    const seen = new Set(base.map(b => b.value));
    for (const item of fromFacets) {
      if (item.value === 'anonymous') {
        base[0].count = item.count;
      } else if (!seen.has(item.value)) {
        seen.add(item.value);
        base.push(item);
      }
    }
    return base;
  })();

  const activeChips = [];
  if (datePreset && datePreset !== 'all') {
    const presetLabel = DATE_PRESETS.find(p => p.id === datePreset)?.label || datePreset;
    const rangeText = startDate || endDate ? ` (${startDate || '…'} → ${endDate || '…'})` : '';
    activeChips.push({
      id: 'date',
      label: `Period: ${presetLabel}${rangeText}`,
      onRemove: () => onDatePresetChange('all')
    });
  }
  if (search?.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search.trim()}"`,
      onRemove: () => onSearchChange('')
    });
  }
  for (const f of FILTER_FIELDS) {
    const vals = filters[f.key] || [];
    for (const v of vals) {
      activeChips.push({
        id: `${f.key}:${v}`,
        label: `${f.label}: ${v}`,
        onRemove: () => onFilterChange(f.key, vals.filter(item => item !== v))
      });
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      {/* Row 1: Date Range Presets (Europe/Berlin) + Search + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-stone-600">
            <Calendar size={13} className="text-amber-600" />
            Period (Europe/Berlin):
          </span>
          {DATE_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onDatePresetChange(p.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                datePreset === p.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search session, IP, user, city, source..."
              className="w-60 rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-7 text-xs outline-none focus:border-amber-500 sm:w-72"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCcw size={12} />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Custom Date Inputs (also shown when a preset is active so admin sees exact Europe/Berlin bounds) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-stone-600">
          <span className="font-medium">From:</span>
          <input
            type="date"
            value={startDate || ''}
            onChange={e => onCustomDateChange(e.target.value, endDate)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-amber-500"
          />
        </label>
        <label className="flex items-center gap-1.5 text-stone-600">
          <span className="font-medium">To:</span>
          <input
            type="date"
            value={endDate || ''}
            onChange={e => onCustomDateChange(startDate, e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-amber-500"
          />
        </label>
        <span className="text-[11px] text-stone-400">
          (00:00:00 – 23:59:59 Europe/Berlin · AND between fields, OR within field)
        </span>
      </div>

      {/* Row 2: 8 Multi-select Field Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {FILTER_FIELDS.map(field => (
          <SessionMultiSelectFilter
            key={field.key}
            label={field.label}
            options={field.key === 'user' ? userOptions : (facets[field.key] || [])}
            selected={filters[field.key] || []}
            onChange={vals => onFilterChange(field.key, vals)}
          />
        ))}
      </div>

      {/* Active filter indicators */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Active:</span>
          {activeChips.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 rounded-full p-0.5 text-amber-700 hover:bg-amber-200/60 hover:text-amber-950"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}