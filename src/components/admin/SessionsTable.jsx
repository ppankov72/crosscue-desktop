import { useState } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export default function SessionsTable({ sessions }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [showCount, setShowCount] = useState(20);

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return !q || [s.email, s.ip, s.country, s.city, s.device, s.os, s.browser].some(v => (v || '').toLowerCase().includes(q));
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] || '', bv = b[sortKey] || '';
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
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
        <h3 className="text-lg font-bold text-stone-900">Сесии ({filtered.length})</h3>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Търсене..." className="w-full rounded-lg border border-stone-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-amber-400 sm:w-64" />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('email')}>Имейл <SortIcon k="email" /></th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('created_date')}>Дата <SortIcon k="created_date" /></th>
              <th className="whitespace-nowrap py-2 px-2">IP</th>
              <th className="cursor-pointer whitespace-nowrap py-2 px-2 hover:text-stone-900" onClick={() => toggleSort('country')}>Държава <SortIcon k="country" /></th>
              <th className="whitespace-nowrap py-2 px-2">Град</th>
              <th className="whitespace-nowrap py-2 px-2">Устр.</th>
              <th className="whitespace-nowrap py-2 px-2">OS</th>
              <th className="whitespace-nowrap py-2 px-2">Браузър</th>
              <th className="whitespace-nowrap py-2 px-2">Страница</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(s => (
              <tr key={s.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="whitespace-nowrap py-2 px-2 font-medium text-stone-900">{s.email}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{new Date(s.created_date).toLocaleString()}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.ip}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.country}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.city}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.device}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.os}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.browser}</td>
                <td className="whitespace-nowrap py-2 px-2 text-stone-600">{s.page}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCount < sorted.length && (
        <button onClick={() => setShowCount(c => c + 20)} className="mt-4 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
          Покажи още ({sorted.length - showCount} остават)
        </button>
      )}
    </div>
  );
}