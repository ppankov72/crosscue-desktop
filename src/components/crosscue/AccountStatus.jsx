import { Clock, Calendar, Crown, CheckCircle, XCircle } from 'lucide-react';
import { formatDuration } from '@/lib/crosscue/trialConfig';

// Account/License status shown in Settings — lightweight, non-intrusive.
export default function AccountStatus({ permission }) {
  if (!permission) return null;

  const { entitlementType, remainingSeconds, allowed, reason } = permission;

  const planInfo = {
    trial: { icon: Clock, label: 'Trial', color: 'text-amber-400' },
    weekend: { icon: Calendar, label: 'Weekend Pass', color: 'text-blue-400' },
    premium: { icon: Crown, label: 'Premium', color: 'text-purple-400' },
    admin: { icon: Crown, label: 'Admin', color: 'text-purple-400' },
    none: { icon: XCircle, label: 'No Plan', color: 'text-red-400' }
  };

  const info = planInfo[entitlementType] || planInfo.none;
  const Icon = info.icon;

  const status = allowed ? 'Active' : 'Expired';
  const statusColor = allowed ? 'text-green-400' : 'text-red-400';
  const StatusIcon = allowed ? CheckCircle : XCircle;

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
      <h3 className="mb-3 text-sm font-bold tracking-wider text-stone-400">LICENSE STATUS</h3>
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${info.color}`} />
        <div className="flex-1">
          <div className="font-bold text-stone-100">{info.label}</div>
          <div className="flex items-center gap-1 text-sm">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className={statusColor}>{status}</span>
          </div>
        </div>
        {entitlementType === 'trial' && remainingSeconds >= 0 && (
          <div className="text-right">
            <div className="text-xs text-stone-500">Remaining</div>
            <div className="font-mono text-lg font-bold text-stone-100">{formatDuration(remainingSeconds)}</div>
          </div>
        )}
        {(entitlementType === 'weekend' || entitlementType === 'premium') && permission.serverTime && (
          <div className="text-right">
            <div className="text-xs text-stone-500">Expires</div>
            <div className="text-sm font-medium text-stone-100">
              {new Date(new Date(permission.serverTime).getTime() + Math.max(0, remainingSeconds) * 1000).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
      {!allowed && reason && (
        <p className="mt-2 text-xs text-stone-500">
          {reason === 'trial_expired' ? 'Trial period ended — upgrade to continue mixing.' :
           reason === 'trial_blocked' ? 'Trial blocked — contact support.' :
           reason === 'no_entitlement' ? 'No active license.' :
           reason === 'license_expired' ? 'License expired.' :
           reason}
        </p>
      )}
    </div>
  );
}