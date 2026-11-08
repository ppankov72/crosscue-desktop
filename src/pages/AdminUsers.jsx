import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, RefreshCw, Search, Users as UsersIcon, UserCog, Mail, Crown, Ban, CheckCircle, XCircle, EyeOff, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ROLE_DISPLAY, ROLE_DISPLAY_LONG } from '@/lib/crosscue/rbac';

export default function AdminUsers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('adminGetUsers', { search, roleFilter, statusFilter, limit: 100 })
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search, roleFilter, statusFilter]);

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

  const users = data?.users || [];

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
              <Link to="/admin/users" className="text-sm font-bold text-stone-900">Users</Link>
              <Link to="/admin/invitations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Invitations</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
              <Link to="/admin/integrations" className="text-sm font-medium text-stone-500 hover:text-amber-700">Integrations</Link>
            </nav>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-bold text-stone-900">Users</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by email, name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-500"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="support">Support</option>
            <option value="tester">Guest DJ</option>
            <option value="member">DJ</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
          </select>
          <button onClick={fetchData} className="rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Users table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-500">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">DJ Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entitlement</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{u.email}</td>
                  <td className="px-4 py-3 text-stone-600">{u.display_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      u.custom_role === 'owner' ? 'bg-purple-100 text-purple-700' :
                      u.custom_role === 'super_admin' || u.custom_role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      u.custom_role === 'tester' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {ROLE_DISPLAY[u.custom_role] || u.custom_role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${
                      u.account_status === 'active' ? 'text-green-600' :
                      u.account_status === 'blocked' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {u.account_status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {u.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{u.entitlement_type !== 'none' ? u.entitlement_type : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-stone-500 capitalize">{u.profile_visibility}</span>
                    {u.moderation_status === 'hidden' && (
                      <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">HIDDEN</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(u.id)} className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-stone-500">{data?.total || 0} users</p>
      </main>

      {selectedUser && <UserDetailModal userId={selectedUser} onClose={() => setSelectedUser(null)} onRefresh={fetchData} />}
    </div>
  );
}

function UserDetailModal({ userId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    base44.functions.invoke('adminGetUserDetail', { userId })
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [userId]);

  const doAction = async (action, extra = {}) => {
    setActionLoading(action);
    try {
      await base44.functions.invoke('adminUpdateUser', { userId, action, ...extra });
      const res = await base44.functions.invoke('adminGetUserDetail', { userId });
      setData(res.data);
      onRefresh();
    } catch {}
    setActionLoading(null);
  };

  const doModerate = async (action) => {
    setActionLoading('moderate');
    try {
      await base44.functions.invoke('adminModerateProfile', { action, profileId: data.profile.id, reason: 'admin_moderation' });
      const res = await base44.functions.invoke('adminGetUserDetail', { userId });
      setData(res.data);
      onRefresh();
    } catch {}
    setActionLoading(null);
  };

  if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  if (!data) return null;

  const u = data.account;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">{u.email}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {/* ACCOUNT */}
        <Section title="ACCOUNT">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Role" value={ROLE_DISPLAY_LONG[u.custom_role] || u.custom_role} />
            <Field label="Status" value={u.account_status} />
            <Field label="Playback Override" value={u.playback_override ? 'Active' : 'Off'} />
            <Field label="Joined" value={u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'} />
          </div>
          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {u.account_status === 'active' ? (
              <button onClick={() => doAction('set_status', { status: 'blocked' })} disabled={actionLoading === 'set_status'}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                {actionLoading === 'set_status' ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Block
              </button>
            ) : (
              <button onClick={() => doAction('set_status', { status: 'active' })} disabled={actionLoading === 'set_status'}
                className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50">
                {actionLoading === 'set_status' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Activate
              </button>
            )}
            <button onClick={() => doAction('set_override', { override: !u.playback_override, reason: 'admin_toggle' })} disabled={actionLoading === 'set_override'}
              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50">
              <Crown size={12} /> {u.playback_override ? 'Disable Override' : 'Enable Override'}
            </button>
          </div>
        </Section>

        {/* PROFILE */}
        {data.profile && (
          <Section title="DJ PROFILE">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Display Name" value={data.profile.display_name} />
              <Field label="Slug" value={`/${data.profile.slug}`} />
              <Field label="Visibility" value={data.profile.visibility} />
              <Field label="Demo" value={data.profile.is_demo ? 'Yes' : 'No'} />
              <Field label="Moderation" value={data.profile.moderation_status || 'active'} />
              {data.profile.bio && <Field label="Bio" value={data.profile.bio} />}
              {data.profile.genres && <Field label="Genres" value={data.profile.genres} />}
            </div>
            {/* Moderation actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {(data.profile.moderation_status || 'active') !== 'hidden' ? (
                <button onClick={() => doModerate('hide')} disabled={actionLoading === 'moderate'}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                  {actionLoading === 'moderate' ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />} Hide Profile
                </button>
              ) : (
                <button onClick={() => doModerate('restore')} disabled={actionLoading === 'moderate'}
                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50">
                  {actionLoading === 'moderate' ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Restore Profile
                </button>
              )}
              {data.profile.slug && (
                <a href={`${window.location.origin}/dj/${data.profile.slug}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
                  <Eye size={12} /> View Public
                </a>
              )}
            </div>
          </Section>
        )}

        {/* TRIAL */}
        {data.trial && (
          <Section title="TRIAL">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Status" value={data.trial.status} />
              <Field label="Used" value={`${Math.floor(data.trial.used_seconds / 60)}m`} />
              <Field label="Remaining" value={`${Math.floor(data.trial.remaining_seconds / 60)}m`} />
              <Field label="Risk" value={`${data.trial.risk_score} (${data.trial.risk_level})`} />
            </div>
          </Section>
        )}

        {/* ENTITLEMENTS */}
        {data.entitlements.length > 0 && (
          <Section title="ENTITLEMENTS">
            <div className="space-y-1">
              {data.entitlements.map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-sm">
                  <span className="font-medium text-stone-700">{e.type}</span>
                  <span className="text-stone-500">{e.status} · {e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* GUEST TESTER */}
        {data.guestTester && (
          <Section title="GUEST DJ TESTING">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Tester Name" value={data.guestTester.tester_name} />
              <Field label="Campaign" value={data.guestTester.campaign} />
              <Field label="Assessment" value={data.guestTester.final_assessment} />
              <Field label="Bugs Reported" value={data.guestTester.bugs_reported_count} />
            </div>
          </Section>
        )}

        {/* MYFEED */}
        {data.myfeedLink && (
          <Section title="MYFEED">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Status" value={data.myfeedLink.status} />
              <Field label="MYFEED Name" value={data.myfeedLink.myfeed_display_name || '—'} />
              <Field label="Linked At" value={data.myfeedLink.linked_at ? new Date(data.myfeedLink.linked_at).toLocaleDateString() : '—'} />
              <Field label="Last Sync" value={data.myfeedLink.last_sync_at ? new Date(data.myfeedLink.last_sync_at).toLocaleDateString() : '—'} />
            </div>
          </Section>
        )}

        {/* AUDIT HISTORY */}
        {data.auditHistory.length > 0 && (
          <Section title="AUDIT HISTORY">
            <div className="space-y-1">
              {data.auditHistory.slice(0, 5).map(a => (
                <div key={a.id} className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
                  <span className="font-medium">{a.action}</span> by {a.admin_email} — {new Date(a.created_date).toLocaleDateString()}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4 rounded-xl border border-stone-200 p-4">
      <h3 className="mb-2 text-xs font-bold tracking-wider text-stone-500">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-stone-400">{label}:</span>{' '}
      <span className="text-stone-700">{value || '—'}</span>
    </div>
  );
}