import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SessionFiltersBar from '@/components/admin/SessionFiltersBar';
import SessionColumnsAndExportBar, { ALL_SESSION_COLUMNS } from '@/components/admin/SessionColumnsAndExportBar';

const FILTERS_STORAGE_KEY = 'crosscue-admin-sessions-filters-v1';
const COLUMNS_STORAGE_KEY = 'crosscue-admin-sessions-columns-v1';

const DEFAULT_FILTERS = {
  country: [],
  city: [],
  device: [],
  os: [],
  browser: [],
  page: [],
  user: [],
  traffic_source: []
};

const DEFAULT_VISIBLE_COLUMNS = [
  'created_date',
  'user',
  'ip',
  'country',
  'city',
  'device',
  'os',
  'browser',
  'page',
  'traffic_source',
  'session_id'
];

function loadSavedState() {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadSavedColumns() {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

const CLASS_BADGES = {
  real: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  internal: 'bg-stone-100 text-stone-700 border-stone-300',
  test: 'bg-amber-50 text-amber-800 border-amber-200',
  bot: 'bg-red-50 text-red-700 border-red-200'
};

export default function RecentVisitors({ visitors, initialSessionsData, trafficFilter = 'real' }) {
  const saved = useRef(loadSavedState()).current;

  const [datePreset, setDatePreset] = useState(saved?.datePreset || 'all');
  const [startDate, setStartDate] = useState(saved?.startDate || '');
  const [endDate, setEndDate] = useState(saved?.endDate || '');
  const [search, setSearch] = useState(saved?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved?.search || '');
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...(saved?.filters || {}) }));
  const [sortBy, setSortBy] = useState(saved?.sortBy || 'created_date');
  const [sortDir, setSortDir] = useState(saved?.sortDir || 'desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(saved?.pageSize || 25);
  const [visibleColumns, setVisibleColumns] = useState(loadSavedColumns);

  const [sessionsData, setSessionsData] = useState(() => initialSessionsData || {
    items: visitors || [],
    total: visitors?.length || 0,
    unfilteredPeriodTotal: visitors?.length || 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    facets: {},
    compareSummary: null
  });
  const [loading, setLoading] = useState(false);
  const [exportingState, setExportingState] = useState(null);

  // Debounce search input slightly for smooth typing while keeping server queries responsive
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  // Persist filters & sort settings in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({
          datePreset,
          startDate,
          endDate,
          search,
          filters,
          sortBy,
          sortDir,
          pageSize
        })
      );
    } catch {}
  }, [datePreset, startDate, endDate, search, filters, sortBy, sortDir, pageSize]);

  // Persist visible columns in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {}
  }, [visibleColumns]);

  // Fetch server-side filtered, sorted, paginated sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getAnalyticsV2', {
        mode: 'sessions',
        traffic_filter: trafficFilter,
        date_preset: datePreset,
        start_date: startDate,
        end_date: endDate,
        filters,
        search: debouncedSearch,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize
      });
      if (res?.data?.sessionsData) {
        const sd = res.data.sessionsData;
        setSessionsData(sd);
        if (sd.dateRange && datePreset !== 'custom' && datePreset !== 'all') {
          setStartDate(sd.dateRange.start_date || '');
          setEndDate(sd.dateRange.end_date || '');
        }
      }
    } catch {
      // Keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [trafficFilter, datePreset, startDate, endDate, filters, debouncedSearch, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  const handleCustomDateChange = (newStart, newEnd) => {
    setDatePreset('custom');
    setStartDate(newStart || '');
    setEndDate(newEnd || '');
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterChange = (fieldKey, values) => {
    setFilters(prev => ({ ...prev, [fieldKey]: values }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setDebouncedSearch('');
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleSort = (colKey) => {
    if (sortBy === colKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(colKey);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleToggleColumn = (colKey) => {
    setVisibleColumns(prev => {
      if (prev.includes(colKey)) {
        if (prev.length <= 1) return prev;
        return prev.filter(k => k !== colKey);
      }
      return [...prev, colKey];
    });
  };

  const handleExport = async (exportScope, format) => {
    const stateKey = `${exportScope}-${format}`;
    setExportingState(stateKey);
    try {
      const res = await base44.functions.invoke('getAnalyticsV2', {
        mode: 'export',
        export_scope: exportScope,
        format,
        traffic_filter: trafficFilter,
        date_preset: datePreset,
        start_date: startDate,
        end_date: endDate,
        filters,
        search: debouncedSearch,
        sort_by: sortBy,
        sort_dir: sortDir,
        visible_columns: visibleColumns
      });
      const payload = res?.data;
      if (!payload) return;

      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `crosscue-sessions-${exportScope}-${trafficFilter}-${stamp}.${format}`;

      let blob;
      if (format === 'xlsx' && payload.base64) {
        const binary = atob(payload.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: payload.mimeType });
      } else {
        blob = new Blob([payload.csv || ''], { type: payload.mimeType || 'text/csv;charset=utf-8;' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingState(null);
    }
  };

  const hasActiveFilters =
    datePreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(search.trim()) ||
    Object.values(filters).some(arr => Array.isArray(arr) && arr.length > 0);

  // In Compare mode, ensure Traffic Class column is visible so real vs excluded rows are immediately clear
  const effectiveColumns = ALL_SESSION_COLUMNS.filter(
    col => visibleColumns.includes(col.key) || (trafficFilter === 'compare' && col.key === 'traffic_class')
  );

  const items = sessionsData?.items || [];
  const total = sessionsData?.total || 0;
  const totalPages = sessionsData?.totalPages || 1;
  const currentPage = sessionsData?.page || page;
  const startRow = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(total, currentPage * pageSize);

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-stone-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">Recent Visitors / Sessions</h2>
          {loading && <Loader2 size={14} className="animate-spin text-amber-600" />}
        </div>
        <span className="text-xs text-stone-400">
          Server-side query · Europe/Berlin timezone
        </span>
      </div>

      <SessionFiltersBar
        datePreset={datePreset}
        startDate={startDate}
        endDate={endDate}
        onDatePresetChange={handleDatePresetChange}
        onCustomDateChange={handleCustomDateChange}
        search={search}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        facets={sessionsData?.facets || {}}
        hasActiveFilters={hasActiveFilters}
      />

      <SessionColumnsAndExportBar
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onResetColumns={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
        onExport={handleExport}
        exportingState={exportingState}
        totalFiltered={total}
        totalPeriodAll={sessionsData?.unfilteredPeriodTotal}
        trafficFilter={trafficFilter}
        compareSummary={sessionsData?.compareSummary}
      />

      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-600">
              {effectiveColumns.map(col => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-bold hover:bg-stone-100 hover:text-stone-900"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSorted ? (
                        sortDir === 'desc' ? (
                          <ChevronDown size={13} className="text-amber-600" />
                        ) : (
                          <ChevronUp size={13} className="text-amber-600" />
                        )
                      ) : (
                        <ChevronsUpDown size={12} className="text-stone-300" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={effectiveColumns.length} className="px-4 py-10 text-center text-sm font-medium text-stone-400">
                  No matching sessions
                </td>
              </tr>
            ) : (
              items.map((v, i) => (
                <tr key={v.session_id || i} className="border-b border-stone-100 hover:bg-stone-50/80">
                  {effectiveColumns.map(col => {
                    if (col.key === 'created_date') {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2 font-mono text-xs text-stone-600">
                          {v.berlin_datetime || (v.created_date ? new Date(v.created_date).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : '—')}
                        </td>
                      );
                    }
                    if (col.key === 'user') {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2 font-medium text-stone-800">
                          {v.user || (v.is_authenticated && v.email ? v.email : 'anonymous')}
                        </td>
                      );
                    }
                    if (col.key === 'ip') {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2 font-mono text-xs text-stone-600">
                          {v.ip || '—'}
                        </td>
                      );
                    }
                    if (col.key === 'traffic_source') {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2 text-xs text-stone-700">
                          <span className="font-semibold">{v.traffic_source_label || v.traffic_source || 'Direct'}</span>
                          {v.traffic_source_detail && !String(v.traffic_source_label || '').toLowerCase().includes(v.traffic_source_detail.toLowerCase()) && (
                            <span className="ml-1 text-stone-400">({v.traffic_source_detail})</span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === 'traffic_class') {
                      const cls = v.traffic_class || 'real';
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2 text-xs">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${CLASS_BADGES[cls] || CLASS_BADGES.real}`}>
                            {cls}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === 'session_id') {
                      return (
                        <td
                          key={col.key}
                          title={v.session_id || ''}
                          className="whitespace-nowrap px-3 py-2 font-mono text-xs text-stone-500"
                        >
                          {v.session_id || '—'}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="whitespace-nowrap px-3 py-2 text-stone-600">
                        {v[col.key] || '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong>{startRow.toLocaleString()}</strong>–<strong>{endRow.toLocaleString()}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> sessions
          </span>
          <label className="ml-2 flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-amber-500"
            >
              {[25, 50, 100, 200].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="px-2 font-semibold text-stone-800">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}