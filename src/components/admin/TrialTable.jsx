import { useState } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDuration, getRiskLevel } from '@/lib/crosscue/trialConfig';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-stone-100 text-stone-600',
  blocked: 'bg-red-100 text-red-700',
  paused: 'bg-amber-100 text-amber-700',
  shadow_blocked: 'bg-purple-100 text-purple-700',
  completed: 'bg-blue-100 text-blue-700',
  pending: 'bg-stone-100 text-stone-500'
};

const riskColors = {
  low: 'text-green-600',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

const heartbeatColors = {
  ok: 'bg-green-500',
  delayed: 'bg-amber-500',
  lost: 'bg-red-500',
  none: 'bg-stone-300'
};

function truncateId(id) {
  if (!id) return '';
  return id.length > 12 ? '…' + id.slice(-8) : id;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function TrialTable({ trials, onSelect }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [sortKey, setSortKey] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showCount, setShowCount] = useState(20);

  const filtered = trials.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (riskFilter !== 'all' && getRiskLevel(t.riskScore) !== riskFilter) return false;
    if (deviceFilter !== 'all' && t.device !== deviceFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.email, t.installationId, t.os, t.browser, t.device, t.userId].some(v => (v || '').toLowerCase().includes(q));
  });

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortKey === 'created') { av = a.createdAt || ''; bv = b.createdAt || ''; }
    else if (sortKey === 'used') { av = a.usedSeconds; bv = b.usedSeconds; }
    else if (sortKey === 'remaining') { av = a.remainingSeconds; bv = b.remainingSeconds; }
    else if (sortKey === 'risk') { av = a.riskScore; bv = b.riskScore; }
    else if (sortKey === 'lastSeen') { av = a.lastActivityAt || ''; bv = b.lastActivityAt || ''; }
    else if (sortKey === 'lastHeartbeat') { av = a.lastHeartbeatAt || ''; bv = b.lastHeartbeatAt || ''; }
    else { av = (a[sortKey] || '').toString().toLowerCase(); bv = (b[sortKey] || '').toString().toLowerCase(); }
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const visible = sorted.slice(0, showCount);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => sortKey === k ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-stone-900">Trials ({filtered.length})</h3>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-stone-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-amber-400 sm:w-48" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="blocked">Blocked</option>
            <option value="paused">Paused</option>
          </select>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none">
            <option value="all">All Risk</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none">
            <option value="all">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('userId')}>User <SortIcon k="userId" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('email')}>Email <SortIcon k="email" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('status')}>Status <SortIcon k="status" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('used')}>Used <SortIcon k="used" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('remaining')}>Remaining <SortIcon k="remaining" /></th>
              <th className="whitespace-nowrap py-2 px-2">Device</th>
              <th className="whitespace-nowrap py-2 px-2">OS</th>
              <th className="whitespace-nowrap py-2 px-2">Browser</th>
              <th className="whitespace-nowrap py-2 px-2">Installation</th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('risk')}>Risk <SortIcon k="risk" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('lastSeen')}>Last Seen <SortIcon k="lastSeen" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('lastHeartbeat')}>Last Heartbeat <SortIcon k="lastHeartbeat" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('created')}>Created <SortIcon k="created" /></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t => (
              <tr key={t.id} onClick={() => onSelect(t.id)} className="cursor-pointer border-b border-stone-100 hover:bg-amber-50">
                <td className="whitespace-nowrap py-2 px-2 font-mono text-xs text-stone-500" title={t.userId}>{truncateId(t.userId)}</td>
                <td className="whitespace-nowrap py-2 px-2 font-medium text-stone-900">{t.email}</td>
                <td className="whitespace-nowrap py-2 px-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusColors[t.status] || 'bg-stone-100 text-stone-600'}`}>{t.status?.toUpperCase()}</span>
                </td>
                <td className="whitespace-nowrap py-2 px-2 font-mono text-stone-600">{formatDuration(t.usedSeconds)}</td>
                <td className="whitespace-nowrap py-2 px-2 font-mono text-stone-600">{formatDuration(t.remainingSeconds)}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{t.device}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{t.os}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{t.browser}</td>
                <td className="whitespace-nowrap py-2 px-2 font-mono text-xs text-stone-500" title={t.installationId}>{truncateId(t.installationId)}</td>
                <td className={`whitespace-nowrap py-2 px-2 font-bold ${riskColors[getRiskLevel(t.riskScore)]}`}>{t.riskScore}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-500">{formatTime(t.lastActivityAt)}</td>
                <td className="whitespace-nowrap py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${heartbeatColors[t.heartbeatStatus] || 'bg-stone-300'}`} title={t.heartbeatStatus} />
                    <span className="text-xs text-stone-500">{formatTime(t.lastHeartbeatAt)}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCount < sorted.length && (
        <button onClick={() => setShowCount(c => c + 20)} className="mt-4 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
          Show more ({sorted.length - showCount} remaining)
        </button>
      )}
    </div>
  );
}