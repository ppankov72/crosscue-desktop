import { useState, useRef, useEffect } from 'react';
import { Columns, Download, Loader2, Check, ChevronDown, Scale } from 'lucide-react';

export const ALL_SESSION_COLUMNS = [
  { key: 'created_date', label: 'Date / Time' },
  { key: 'user', label: 'User' },
  { key: 'ip', label: 'IP' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'device', label: 'Device' },
  { key: 'os', label: 'OS' },
  { key: 'browser', label: 'Browser' },
  { key: 'page', label: 'Page' },
  { key: 'traffic_source', label: 'Traffic Source' },
  { key: 'traffic_class', label: 'Traffic Class' },
  { key: 'session_id', label: 'Session' }
];

export default function SessionColumnsAndExportBar({
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  onExport,
  exportingState,
  totalFiltered,
  totalPeriodAll,
  trafficFilter,
  compareSummary
}) {
  const [colsOpen, setColsOpen] = useState(false);
  const [filteredExportOpen, setFilteredExportOpen] = useState(false);
  const [allExportOpen, setAllExportOpen] = useState(false);

  const colsRef = useRef(null);
  const filtExpRef = useRef(null);
  const allExpRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false);
      if (filtExpRef.current && !filtExpRef.current.contains(e.target)) setFilteredExportOpen(false);
      if (allExpRef.current && !allExpRef.current.contains(e.target)) setAllExportOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Session count summary */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-semibold text-stone-900">
            {totalFiltered.toLocaleString()} matching {totalFiltered === 1 ? 'session' : 'sessions'}
          </span>
          {totalPeriodAll !== undefined && totalPeriodAll !== totalFiltered && (
            <span className="text-stone-400">
              (of {totalPeriodAll.toLocaleString()} in selected period)
            </span>
          )}
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            Mode: {trafficFilter === 'all' ? 'All traffic' : trafficFilter === 'compare' ? 'Compare (Real vs Excluded)' : 'Real traffic'}
          </span>
        </div>

        {/* Columns selector + Two separate Export buttons (Export Filtered & Export All) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Visible Columns Selector */}
          <div ref={colsRef} className="relative">
            <button
              type="button"
              onClick={() => setColsOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Columns size={13} />
              Columns ({visibleColumns.length}/{ALL_SESSION_COLUMNS.length})
              <ChevronDown size={12} className="text-stone-400" />
            </button>

            {colsOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] text-stone-500">
                  <span className="font-semibold">Visible Columns</span>
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="font-semibold text-amber-700 hover:text-amber-900"
                  >
                    Show All
                  </button>
                </div>
                <div className="space-y-0.5">
                  {ALL_SESSION_COLUMNS.map(col => {
                    const checked = visibleColumns.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => onToggleColumn(col.key)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                              checked ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-300 bg-white'
                            }`}
                          >
                            {checked && <Check size={10} />}
                          </span>
                          <span>{col.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Button 1: Export Filtered */}
          <div ref={filtExpRef} className="relative">
            <button
              type="button"
              disabled={Boolean(exportingState) || totalFiltered === 0}
              onClick={() => setFilteredExportOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportingState?.startsWith('filtered-') ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export Filtered ({totalFiltered.toLocaleString()})
              <ChevronDown size={12} />
            </button>

            {filteredExportOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setFilteredExportOpen(false);
                    onExport('filtered', 'csv');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <span>Export Filtered as CSV</span>
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">.csv</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilteredExportOpen(false);
                    onExport('filtered', 'xlsx');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <span>Export Filtered as Excel</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">.xlsx</span>
                </button>
              </div>
            )}
          </div>

          {/* Button 2: Export All (ignores field filters/search, preserves period & traffic mode) */}
          <div ref={allExpRef} className="relative">
            <button
              type="button"
              disabled={Boolean(exportingState) || (totalPeriodAll ?? totalFiltered) === 0}
              onClick={() => setAllExportOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exportingState?.startsWith('all-') ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export All ({(totalPeriodAll ?? totalFiltered).toLocaleString()})
              <ChevronDown size={12} />
            </button>

            {allExportOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                <div className="px-2.5 py-1 text-[10px] text-stone-400">
                  Ignores filters · keeps period &amp; traffic mode
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllExportOpen(false);
                    onExport('all', 'csv');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <span>Export All as CSV</span>
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">.csv</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAllExportOpen(false);
                    onExport('all', 'xlsx');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <span>Export All as Excel</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">.xlsx</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare mode breakdown bar: separate values for Real vs Excluded traffic */}
      {trafficFilter === 'compare' && compareSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-950">
            <Scale size={14} className="text-amber-700" />
            <span>Compare Mode (Matching Sessions Breakdown):</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900">
              Real Traffic: {compareSummary.realTotal.toLocaleString()} sessions
            </span>
            <span className="rounded-md bg-stone-200 px-2.5 py-1 font-bold text-stone-800">
              Excluded Traffic: {compareSummary.excludedTotal.toLocaleString()} sessions
              <span className="ml-1.5 font-normal text-stone-600">
                (Internal: {compareSummary.byClass?.internal || 0} · Test: {compareSummary.byClass?.test || 0} · Bot: {compareSummary.byClass?.bot || 0})
              </span>
            </span>
            <span className="font-semibold text-stone-700">
              All Matching: {compareSummary.allTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}