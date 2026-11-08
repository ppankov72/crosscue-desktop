import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, RefreshCw, Rss, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Control Room — Integrations page.
// Shows MYFEED API status, linked users, recent errors.
// Never exposes API secret or private profile content.
export default function AdminIntegrations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('getMyFeedAdminStatus', {})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <Shield className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access Denied</p>
        <Link to="/" className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white">Back to App</Link>
      </div>
    );
  }

  const health = data?.apiHealth || 'unknown';
  const healthConfig = {
    connected: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Connected' },
    degraded: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Degraded' },
    unavailable: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Unavailable' },
    unknown: { icon: AlertCircle, color: 'text-stone-500', bg: 'bg-stone-100', label: 'Unknown' }
  }[health] || { icon: AlertCircle, color: 'text-stone-500', bg: 'bg-stone-100', label: 'Unknown' };
  const HealthIcon = healthConfig.icon;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE Control Room</span>
            <nav className="ml-6 flex items-center gap-4 border-l border-stone-200 pl-6">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">Overview</Link>
              <Link to="/admin/trial" className="text-sm font-medium text-stone-500 hover:text-amber-700">Trial</Link>
              <Link to="/admin/users" className="text-sm font-medium text-stone-500 hover:text-amber-700">Users</Link>
              <Link to="/admin/invitations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
              <Link to="/admin/integrations" className="text-sm font-bold text-stone-900">Integrations</Link>
            </nav>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">Integrations</h1>
          <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* MYFEED API Status */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${healthConfig.bg}`}>
                <Rss size={24} className={healthConfig.color} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">MYFEED API v1</h2>
                <div className="flex items-center gap-1.5">
                  <HealthIcon size={16} className={healthConfig.color} />
                  <span className={`text-sm font-bold ${healthConfig.color}`}>{healthConfig.label}</span>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-stone-500">
              <p>Config: {data?.configStatus?.configured ? 'Ready' : 'Not configured'}</p>
              <p>Client ID: {data?.configStatus?.clientId || 'missing'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Linked Users" value={String(data?.linkedCount || 0)} color="text-green-600" />
          <StatCard label="Pending Links" value={String(data?.pendingCount || 0)} color="text-yellow-600" />
          <StatCard label="Errors" value={String(data?.errorCount || 0)} color="text-red-600" />
        </div>

        {/* Recent Errors */}
        {data?.recentErrors && data.recentErrors.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-500">RECENT INTEGRATION ERRORS</h3>
            <div className="space-y-2">
              {data.recentErrors.map((e, i) => (
                <div key={i} className="rounded-lg bg-red-50 px-3 py-2 text-sm">
                  <span className="font-medium text-red-700">{e.user_email || 'Unknown'}</span>
                  <span className="ml-2 text-red-500">{e.error}</span>
                  <span className="ml-2 text-xs text-stone-400">{e.timestamp ? new Date(e.timestamp).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Successful Request */}
        {data?.lastSuccessfulRequest && (
          <div className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-500">
            Last successful request: {new Date(data.lastSuccessfulRequest).toLocaleString()}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-bold tracking-wider text-stone-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}