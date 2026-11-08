import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, Mail, Calendar, Crown, Ban, RefreshCw, UserPlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ROLE_DISPLAY } from '@/lib/crosscue/rbac';

export default function AdminInvitations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('adminGetInvitations', {})
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
              <Link to="/admin/invitations" className="text-sm font-bold text-stone-900">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
            </nav>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">Invitations & Guest DJs</h1>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
            <UserPlus size={16} /> New Invitation
          </button>
        </div>

        {/* Guest DJs */}
        {data?.guestTesters?.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">GUEST DJS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Campaign</th>
                    <th className="px-2 py-2">Assessment</th>
                    <th className="px-2 py-2">Bugs</th>
                    <th className="px-2 py-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.guestTesters.map(t => (
                    <tr key={t.id} className="border-b border-stone-100">
                      <td className="px-2 py-2 font-medium text-stone-800">{t.tester_name}</td>
                      <td className="px-2 py-2 text-stone-600">{t.email}</td>
                      <td className="px-2 py-2 text-stone-500">{t.campaign || '—'}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                          t.final_assessment === 'pass' ? 'bg-green-100 text-green-700' :
                          t.final_assessment === 'fail' ? 'bg-red-100 text-red-700' :
                          t.final_assessment === 'in_test' ? 'bg-blue-100 text-blue-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>{t.final_assessment}</span>
                      </td>
                      <td className="px-2 py-2 text-stone-600">{t.bugs_reported_count}</td>
                      <td className="px-2 py-2 text-stone-500">{t.test_started_at ? new Date(t.test_started_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invitations */}
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-700">INVITATIONS</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Entitlement</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Created</th>
                  <th className="px-2 py-2">Expires</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.invitations?.map(i => (
                  <tr key={i.id} className="border-b border-stone-100">
                    <td className="px-2 py-2 font-medium text-stone-800">{i.email}</td>
                    <td className="px-2 py-2 text-stone-600">{i.invitation_type}</td>
                    <td className="px-2 py-2 text-stone-600">{ROLE_DISPLAY[i.role_to_assign] || i.role_to_assign}</td>
                    <td className="px-2 py-2 text-stone-600">{i.entitlement_to_grant}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                        i.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        i.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        i.status === 'revoked' ? 'bg-red-100 text-red-700' :
                        'bg-stone-100 text-stone-500'
                      }`}>{i.status}</span>
                    </td>
                    <td className="px-2 py-2 text-stone-500">{i.created_at ? new Date(i.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-2 py-2 text-stone-500">{i.expires_at ? new Date(i.expires_at).toLocaleDateString() : '—'}</td>
                    <td className="px-2 py-2">
                      {i.status === 'pending' && (
                        <button onClick={() => base44.functions.invoke('adminRevokeInvitation', { invitationId: i.id }).then(fetchData)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
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
      </main>

      {showCreate && <CreateInvitationModal onClose={() => setShowCreate(false)} onCreated={fetchData} />}
    </div>
  );
}

function CreateInvitationModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    invitationType: 'guest_dj',
    roleToAssign: 'tester',
    entitlementToGrant: 'weekend',
    campaign: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('adminCreateInvitation', form);
      setResult(res.data);
      onCreated();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-xl font-bold text-stone-900">New Invitation</h2>
        {result?.ok ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">Invitation created!</p>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Share this link:</p>
              <code className="text-sm text-stone-800">{window.location.origin}/invite?token={result.token}</code>
            </div>
            <button onClick={onClose} className="w-full rounded-lg bg-stone-900 py-2 text-sm font-bold text-white">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-500">EMAIL</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-500">TYPE</label>
              <select value={form.invitationType} onChange={e => setForm({ ...form, invitationType: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                <option value="guest_dj">Guest DJ</option>
                <option value="member">DJ (Member)</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-500">ROLE TO ASSIGN</label>
              <select value={form.roleToAssign} onChange={e => setForm({ ...form, roleToAssign: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                <option value="tester">Guest DJ (Tester)</option>
                <option value="member">DJ (Member)</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-500">ENTITLEMENT</label>
              <select value={form.entitlementToGrant} onChange={e => setForm({ ...form, entitlementToGrant: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
                <option value="none">None</option>
                <option value="weekend">Weekend Pass</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-500">CAMPAIGN (optional)</label>
              <input type="text" value={form.campaign} onChange={e => setForm({ ...form, campaign: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.email} className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}