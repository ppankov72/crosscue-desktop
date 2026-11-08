import useDjProfile from '@/hooks/useDjProfile';
import { getRoleDisplayLong } from '@/lib/crosscue/rbac';
import { Mail, Shield, Crown, LogOut, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Account settings — email, role, account status, sign out.
export default function AccountSettings() {
  const { account, loading } = useDjProfile();

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-stone-500" /></div>;
  }

  if (!account) {
    return <p className="text-sm text-stone-500">Account info unavailable.</p>;
  }

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  const statusColor = {
    active: 'text-green-400',
    pending: 'text-yellow-400',
    suspended: 'text-orange-400',
    blocked: 'text-red-400',
    deleted: 'text-stone-500'
  }[account.account_status] || 'text-stone-400';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
        <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-400">ACCOUNT</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-stone-500" />
            <span className="text-stone-300">{account.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-500" />
            <span className="text-stone-300">{getRoleDisplayLong(account)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} className={statusColor} />
            <span className={`capitalize ${statusColor}`}>{account.account_status}</span>
          </div>
          {account.playback_override && (
            <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
              Playback override active — unlimited access enabled by admin
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 py-2.5 text-sm font-medium text-stone-400 hover:bg-stone-800"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}