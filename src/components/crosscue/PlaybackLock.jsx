import { Clock, Calendar, Crown, X, WifiOff } from 'lucide-react';
import { useTrialI18n } from '@/lib/landing/i18n';
import TrialCheckout from '@/components/crosscue/TrialCheckout';

// Lock modal shown when trial is expired or no valid entitlement.
export default function PlaybackLock({ open, onClose, reason, language }) {
  const { t } = useTrialI18n();
  if (!open) return null;

  const isNetworkLoss = reason === 'network_lost' || reason === 'no_server_connection';
  const tr = isNetworkLoss ? t.trial.network : t.trial.expired;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-amber-300 bg-stone-900 p-8 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isNetworkLoss ? (
              <WifiOff className="h-8 w-8 text-amber-400" />
            ) : (
              <Clock className="h-8 w-8 text-amber-400" />
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
              <X size={20} />
            </button>
          )}
        </div>

        {isNetworkLoss ? (
          <>
            <h2 className="mt-4 text-2xl font-bold text-stone-100">{tr.title}</h2>
            <p className="mt-2 text-stone-400">{tr.body}</p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-center font-bold text-white hover:bg-amber-600"
            >
              {tr.retry}
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-2xl font-bold text-stone-100">{tr.title}</h2>
            <p className="mt-2 text-stone-400">{tr.body}</p>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-stone-700 bg-stone-800 p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-stone-100">{tr.weekendPass}</span>
                  <span className="ml-auto text-lg font-bold text-amber-400">€4.99</span>
                </div>
                <p className="mt-1 text-sm text-stone-400">{tr.weekendDesc}</p>
              </div>

              <div className="rounded-xl border border-amber-500 bg-amber-900/30 p-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-stone-100">{tr.premium}</span>
                  <span className="ml-auto text-lg font-bold text-amber-400">€12.99</span>
                  <span className="text-sm text-stone-400">/mo</span>
                </div>
                <p className="mt-1 text-sm text-stone-400">{tr.premiumDesc}</p>
              </div>
            </div>

            {reason === 'trial_expired' ? <TrialCheckout /> : <p className="mt-4 text-center text-xs text-stone-500">{tr.paymentsSoon}</p>}

            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 w-full rounded-xl border border-stone-700 py-2.5 text-center font-medium text-stone-400 hover:bg-stone-800"
              >
                {tr.close}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}