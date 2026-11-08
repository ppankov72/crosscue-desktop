import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TrialOverviewCards from '@/components/admin/TrialOverviewCards';
import TrialTable from '@/components/admin/TrialTable';
import TrialDetail from '@/components/admin/TrialDetail';

export default function AdminTrial() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrialId, setSelectedTrialId] = useState(null);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('getTrialAdminData', {})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

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
        <p className="text-lg font-bold text-stone-900">Access Denied</p>
        <p className="text-stone-500">This page is for administrators only.</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">
          <ArrowLeft size={16} /> Back to App
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

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE Admin</span>
            <nav className="ml-6 flex items-center gap-4 border-l border-stone-200 pl-6">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">Overview</Link>
              <Link to="/admin/trial" className="text-sm font-bold text-stone-900">Trial</Link>
              <Link to="/admin/users" className="text-sm font-medium text-stone-500 hover:text-amber-700">Users</Link>
              <Link to="/admin/invitations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> Back to App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-green-500 bg-green-50 px-4 py-2.5 text-sm font-bold text-green-800">
          ENFORCEMENT MODE ACTIVE — Server controls playback permission
        </div>
        <TrialOverviewCards overview={data.overview} />
        {data.entitlements && data.entitlements.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">ENTITLEMENTS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Source</th>
                    <th className="px-2 py-2">Starts</th>
                    <th className="px-2 py-2">Expires</th>
                    <th className="px-2 py-2">Granted By</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entitlements.map(e => (
                    <tr key={e.id} className="border-b border-stone-100">
                      <td className="px-2 py-2 font-medium text-stone-800">{e.email || '—'}</td>
                      <td className="px-2 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${e.type === 'premium' ? 'bg-purple-100 text-purple-700' : e.type === 'weekend' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>{e.type}</span></td>
                      <td className="px-2 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${e.status === 'active' ? 'bg-green-100 text-green-700' : e.status === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'}`}>{e.status}</span></td>
                      <td className="px-2 py-2 text-stone-500">{e.source}</td>
                      <td className="px-2 py-2 text-stone-500">{e.startsAt ? new Date(e.startsAt).toLocaleString() : '—'}</td>
                      <td className="px-2 py-2 text-stone-500">{e.expiresAt ? new Date(e.expiresAt).toLocaleString() : '—'}</td>
                      <td className="px-2 py-2 text-stone-500">{e.grantedBy || '—'}</td>
                      <td className="px-2 py-2">
                        {e.status === 'active' && (
                          <button
                            onClick={() => base44.functions.invoke('adminTrialAction', { action: 'revoke_entitlement', entitlementId: e.id, reason: 'manual_admin' }).then(() => fetchData())}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <TrialTable trials={data.trials} onSelect={setSelectedTrialId} />
      </main>
      {selectedTrialId && (
        <TrialDetail trialId={selectedTrialId} onClose={() => setSelectedTrialId(null)} onAction={fetchData} />
      )}
    </div>
  );
}