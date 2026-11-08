// Admin: Gift / Prize Pass management (vouchers).
// Create, view, copy, revoke vouchers. Part of Commerce.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw, Loader2, Gift, Copy, Check, Ban, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ENTITLEMENT_TYPES = [
  { value: 'weekend', label: 'Weekend Pass (3 days)' },
  { value: 'premium_1m', label: 'Premium (1 month)' },
  { value: 'premium_3m', label: 'Premium (3 months)' },
  { value: 'premium_1y', label: 'Premium (1 year)' },
];
const VOUCHER_TYPES = [
  { value: 'gift_voucher', label: 'Gift Voucher' },
  { value: 'contest_prize', label: 'Contest Prize' },
  { value: 'promotional_pass', label: 'Promotional Pass' },
  { value: 'partner_pass', label: 'Partner Pass' },
  { value: 'community_prize', label: 'Community Prize' },
];
const STATUS_COLORS = {
  created: 'bg-stone-100 text-stone-600',
  sent: 'bg-blue-100 text-blue-700',
  redeemed: 'bg-green-100 text-green-700',
  expired: 'bg-yellow-100 text-yellow-700',
  revoked: 'bg-red-100 text-red-700',
};

export default function AdminVouchers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [form, setForm] = useState({
    entitlement_type: 'weekend',
    voucher_type: 'gift_voucher',
    quantity: 1,
    recipient_email: '',
    recipient_dj_name: '',
    message: '',
    source_campaign: '',
    expires_at: '',
  });

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('adminGetVouchers', {})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await base44.functions.invoke('adminCreateVoucher', form);
      setShowCreate(false);
      setForm({ entitlement_type: 'weekend', voucher_type: 'gift_voucher', quantity: 1, recipient_email: '', recipient_dj_name: '', message: '', source_campaign: '', expires_at: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'create_failed');
    }
    setCreating(false);
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this voucher? The recipient will not be able to redeem it.')) return;
    setRevoking(id);
    try {
      await base44.functions.invoke('adminRevokeVoucher', { voucher_id: id });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'revoke_failed');
    }
    setRevoking(null);
  };

  const copyCode = (id, code) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const overview = data?.overview || {};
  const vouchers = data?.vouchers || [];

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
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
              <Link to="/admin/vouchers" className="text-sm font-bold text-stone-900">Gift Passes</Link>
              <Link to="/admin/feedback" className="text-sm font-medium text-stone-500 hover:text-amber-700">Feedback</Link>
            </nav>
          </div>
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"><ArrowLeft size={14} /> Back</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">Gift / Prize Passes</h1>
          <div className="flex gap-2">
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"><RefreshCw size={14} /> Refresh</button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"><Plus size={14} /> Create Voucher</button>
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Total" value={overview.total || 0} />
          <StatCard label="Created" value={overview.created || 0} />
          <StatCard label="Sent" value={overview.sent || 0} />
          <StatCard label="Redeemed" value={overview.redeemed || 0} />
          <StatCard label="Revoked" value={overview.revoked || 0} />
        </div>

        {error && error !== 'forbidden' && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Error: {error}</div>
        )}

        {/* Voucher list */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">VOUCHERS ({vouchers.length})</h3>
          {vouchers.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">No vouchers yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Entitlement</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Recipient</th>
                    <th className="px-2 py-2">Campaign</th>
                    <th className="px-2 py-2">Redeemed</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} className="border-b border-stone-100">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <code className="font-mono text-xs font-bold text-stone-800">{v.voucher_code}</code>
                          <button onClick={() => copyCode(v.id, v.voucher_code)} className="text-stone-400 hover:text-amber-600" title="Copy code">
                            {copiedId === v.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-stone-600">{v.voucher_type}</td>
                      <td className="px-2 py-2 text-stone-600">{v.entitlement_type}</td>
                      <td className="px-2 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[v.status] || 'bg-stone-100'}`}>{v.status}</span></td>
                      <td className="px-2 py-2 text-stone-600">{v.recipient_email || v.recipient_dj_name || '—'}</td>
                      <td className="px-2 py-2 text-stone-500">{v.source_campaign || '—'}</td>
                      <td className="px-2 py-2 text-stone-500">{v.redeemed_at ? new Date(v.redeemed_at).toLocaleDateString() : '—'}</td>
                      <td className="px-2 py-2">
                        {(v.status === 'created' || v.status === 'sent') && (
                          <button onClick={() => handleRevoke(v.id)} disabled={revoking === v.id} className="inline-flex items-center gap-1 rounded border border-stone-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                            {revoking === v.id ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />} Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2"><Gift size={18} className="text-amber-600" /> Create Gift / Prize Pass</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-stone-100"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-stone-700">Entitlement</label>
                  <select value={form.entitlement_type} onChange={e => setForm({ ...form, entitlement_type: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                    {ENTITLEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-stone-700">Voucher Type</label>
                  <select value={form.voucher_type} onChange={e => setForm({ ...form, voucher_type: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                    {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">Quantity</label>
                <input type="number" min="1" max="50" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-stone-700">Recipient Email <span className="text-stone-400">(optional)</span></label>
                  <input type="email" value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-bold text-stone-700">Recipient DJ Name <span className="text-stone-400">(optional)</span></label>
                  <input type="text" value={form.recipient_dj_name} onChange={e => setForm({ ...form, recipient_dj_name: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">Campaign / Source <span className="text-stone-400">(optional)</span></label>
                <input type="text" placeholder="e.g. AI_TRACK_OF_THE_WEEK" value={form.source_campaign} onChange={e => setForm({ ...form, source_campaign: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">Message <span className="text-stone-400">(optional)</span></label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">Voucher Expiry <span className="text-stone-400">(optional — must be redeemed before)</span></label>
                <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{creating ? <Loader2 size={14} className="animate-spin" /> : null} Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}