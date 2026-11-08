import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle, RefreshCw, Users, Eye, MousePointerClick, Activity, Globe, Mail, Search, Share2, DollarSign, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ActivityChart from '@/components/admin/ActivityChart';
import GeoSection from '@/components/admin/GeoSection';
import DeviceBreakdown from '@/components/admin/DeviceBreakdown';
import RecentVisitors from '@/components/admin/RecentVisitors';
import TrafficFilter from '@/components/analytics/TrafficFilter';
import TrafficComparison from '@/components/analytics/TrafficComparison';
import useTrafficFilter from '@/hooks/useTrafficFilter';

const TRAFFIC_ICONS = {
  organic: Search, direct: Link2, referral: Share2,
  social: Share2, email: Mail, paid: DollarSign, none: Globe
};

export default function Admin() {
  const [trafficFilter,setTrafficFilter]=useTrafficFilter('analytics');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('getAnalyticsV2', {traffic_filter:trafficFilter})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  }, [trafficFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <Shield className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access denied</p>
        <p className="text-stone-500">This page is for administrators only.</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">
          <ArrowLeft size={16} /> Back to app
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-bold text-stone-900">Error loading data</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  const o = data.overview;

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE Control Room</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-4 border-r border-stone-200 pr-4">
              <Link to="/admin" className="text-sm font-bold text-stone-900">Overview</Link>
              <Link to="/admin/trial" className="text-sm font-medium text-stone-500 hover:text-amber-700">Trial</Link>
              <Link to="/admin/users" className="text-sm font-medium text-stone-500 hover:text-amber-700">Users</Link>
              <Link to="/admin/invitations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
              <Link to="/admin/vouchers" className="text-sm font-medium text-stone-500 hover:text-amber-700">Vouchers</Link>
              <Link to="/admin/feedback" className="text-sm font-medium text-stone-500 hover:text-amber-700">Feedback</Link>
              <Link to="/admin/content" className="text-sm font-medium text-stone-500 hover:text-amber-700">Content</Link>
              <Link to="/admin/landing" className="text-sm font-medium text-stone-500 hover:text-amber-700">Landing</Link>
              <Link to="/admin/marketing" className="text-sm font-medium text-amber-700 font-bold">Marketing</Link>
            </nav>
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> To app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <TrafficFilter mode={trafficFilter} onChange={setTrafficFilter} traffic={data.traffic}/>
        <TrafficComparison comparison={data.comparison}/>
        {/* V2 Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <Users size={16} /><span className="text-xs font-bold uppercase tracking-wide">Unique Visitors</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-stone-900">{o.totalVisitors}</p>
            <p className="mt-1 text-xs text-stone-400">{o.visitorsToday} today</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <Activity size={16} /><span className="text-xs font-bold uppercase tracking-wide">Sessions</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-stone-900">{o.totalSessions}</p>
            <p className="mt-1 text-xs text-stone-400">{o.sessionsToday} today</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <Eye size={16} /><span className="text-xs font-bold uppercase tracking-wide">Pageviews</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-stone-900">{o.totalPageviews}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <MousePointerClick size={16} /><span className="text-xs font-bold uppercase tracking-wide">Total Events</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-stone-900">{o.totalEvents}</p>
            <p className="mt-1 text-xs text-stone-400">{o.trialUsers} trial · {o.authenticatedUsers} auth</p>
          </div>
        </div>

        <ActivityChart activity={data.activity} />

        {/* Traffic Sources */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-700">Traffic Sources</h2>
          {data.trafficSources.length === 0 ? (
            <p className="text-sm text-stone-400">No traffic data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.trafficSources.slice(0, 12).map((ts, i) => {
                const Icon = TRAFFIC_ICONS[ts.source] || Globe;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-stone-100 px-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
                      <Icon size={14} className="text-stone-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold capitalize text-stone-800">{ts.source}</span>
                      {ts.detail && <span className="ml-2 truncate text-xs text-stone-400">{ts.detail}</span>}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-stone-500"><strong className="text-stone-800">{ts.visitors}</strong> visitors</span>
                      <span className="text-stone-500"><strong className="text-stone-800">{ts.sessions}</strong> sessions</span>
                      <span className="text-stone-500"><strong className="text-stone-800">{ts.pageviews}</strong> views</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Types */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-700">Event Breakdown</h2>
          {data.eventTypes.length === 0 ? (
            <p className="text-sm text-stone-400">No events yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.eventTypes.map((e, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5">
                  <span className="text-xs font-bold text-stone-700">{e.type}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection geo={data.geo} />
          <DeviceBreakdown devices={data.devices} />
        </div>

        <RecentVisitors visitors={data.recentVisitors} initialSessionsData={data.sessionsData} trafficFilter={trafficFilter} />
      </main>
    </div>
  );
}