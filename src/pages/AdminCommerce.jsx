import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, CreditCard, Receipt, RefreshCw, Crown, Webhook } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminCommerce() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('adminGetCommerce', {})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !data) {
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

  return (
    <div className="admin-content min-h-screen bg-stone-50">
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
              <Link to="/admin/commerce" className="text-sm font-bold text-stone-900">Commerce</Link>
              <Link to="/admin/vouchers" className="text-sm font-medium text-stone-500 hover:text-amber-700">Gift Passes</Link>
              <Link to="/admin/integrations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Integrations</Link>
            </nav>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold text-stone-900">Commerce</h1>

        {/* Payment provider status */}
        <div className={`rounded-xl border p-4 ${data?.paymentProviderReady ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-center gap-2">
            <CreditCard className={data?.paymentProviderReady ? 'text-green-600' : 'text-amber-600'} />
            <span className="font-bold text-stone-900">
              {data?.paymentProviderReady ? `Payment Provider Active: ${data?.paymentProvider?.name || ''}` : 'WAITING FOR PAYMENT PROVIDER CONFIGURATION'}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {data?.paymentProviderReady
              ? 'Orders and payments are being processed via ' + (data?.paymentProvider?.code || '') + '.'
              : 'Commerce architecture is ready. Real payments require provider configuration (API keys, webhook secrets). Orders can be created but payment confirmation is pending.'}
          </p>
          {data?.paymentProvider?.available && (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.paymentProvider.available.map(p => (
                <span key={p.code} className={`rounded px-2 py-0.5 text-xs font-medium ${p.configured ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                  {p.name} {p.configured ? '✓' : '(not configured)'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">PLANS</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {data?.plans?.map(p => (
              <div key={p.id} className="rounded-lg border border-stone-200 p-3">
                <div className="font-bold text-stone-800">{p.name}</div>
                <div className="text-2xl font-bold text-amber-600">€{p.price}</div>
                <div className="text-xs text-stone-500">{p.interval} · {p.active ? 'Active' : 'Inactive'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">ORDERS ({data?.orders?.length || 0})</h3>
          {data?.orders?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Plan</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map(o => (
                    <tr key={o.id} className="border-b border-stone-100">
                      <td className="px-2 py-2 text-stone-700">{o.email}</td>
                      <td className="px-2 py-2 text-stone-600">{o.plan_name}</td>
                      <td className="px-2 py-2 font-medium text-stone-800">€{o.amount}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                          o.status === 'paid' ? 'bg-green-100 text-green-700' :
                          o.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{o.status}</span>
                      </td>
                      <td className="px-2 py-2 text-stone-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-stone-500">No orders yet.</p>
          )}
        </div>

        {/* Subscriptions */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">SUBSCRIPTIONS ({data?.subscriptions?.length || 0})</h3>
          {data?.subscriptions?.length > 0 ? (
            <div className="space-y-1">
              {data.subscriptions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span className="text-stone-700">{s.email}</span>
                  <span className="text-stone-500">{s.plan_code} · {s.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">No subscriptions yet.</p>
          )}
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">PAYMENTS ({data?.payments?.length || 0})</h3>
          {data?.payments?.length > 0 ? (
            <div className="space-y-1">
              {data.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span className="text-stone-700">{p.email} · €{p.amount}</span>
                  <span className="text-stone-500">{p.provider} · {p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">No payments yet.</p>
          )}
        </div>

        {/* Payment Events (Webhook Log) */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Webhook size={16} className="text-stone-600" />
            <h3 className="text-sm font-bold tracking-wider text-stone-700">PAYMENT EVENTS / WEBHOOK LOG ({data?.paymentEvents?.length || 0})</h3>
          </div>
          {data?.paymentEvents?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                    <th className="px-2 py-2">Event ID</th>
                    <th className="px-2 py-2">Provider</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Signature</th>
                    <th className="px-2 py-2">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentEvents.map(e => (
                    <tr key={e.id} className="border-b border-stone-100">
                      <td className="px-2 py-2 font-mono text-xs text-stone-600">{e.event_id?.substring(0, 20) || '—'}...</td>
                      <td className="px-2 py-2 text-stone-600">{e.provider}</td>
                      <td className="px-2 py-2 text-stone-600">{e.event_type}</td>
                      <td className="px-2 py-2 text-stone-700">€{e.amount || 0}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                          e.status === 'processed' ? 'bg-green-100 text-green-700' :
                          e.status === 'failed' ? 'bg-red-100 text-red-700' :
                          e.status === 'duplicate' ? 'bg-stone-100 text-stone-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-2 py-2">
                        {e.signature_valid ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                      </td>
                      <td className="px-2 py-2 text-stone-500">{e.processed_at ? new Date(e.processed_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-stone-500">No webhook events received yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}