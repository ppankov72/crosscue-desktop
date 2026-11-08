import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Portal Orders — user's own orders only. Server-enforced ownership.
export default function PortalOrders({ t }) {
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getPortalOrders', {});
      setOrders(res.data?.orders || []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">{t.orders.title}</h2>
        <button onClick={fetchOrders} disabled={loading} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {t.orders.paymentPending}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>
      ) : orders && orders.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-500">
                <th className="px-4 py-3">{t.orders.reference}</th>
                <th className="px-4 py-3">{t.orders.plan}</th>
                <th className="px-4 py-3">{t.orders.amount}</th>
                <th className="px-4 py-3">{t.orders.status}</th>
                <th className="px-4 py-3">{t.orders.created}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-stone-100">
                  <td className="px-4 py-3 font-mono text-stone-600">#{o.reference}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{o.plan_name}</td>
                  <td className="px-4 py-3 text-stone-600">€{o.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      o.status === 'paid' ? 'bg-green-100 text-green-700' :
                      o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      o.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{o.created ? new Date(o.created).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white py-12 text-center">
          <ShoppingBag size={32} className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm text-stone-400">{t.orders.empty}</p>
        </div>
      )}
    </div>
  );
}