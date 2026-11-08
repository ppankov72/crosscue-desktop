import { WifiOff } from 'lucide-react';
import { useTrialI18n } from '@/lib/landing/i18n';

// Banner shown during grace period (0-3 seconds of lost server connection).
export default function NetworkLossBanner({ visible, graceSecondsLeft, language }) {
  const { t } = useTrialI18n();
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-pulse">
      <div className="flex items-center gap-3 rounded-full border border-amber-500 bg-amber-900/90 px-5 py-2.5 shadow-lg backdrop-blur">
        <WifiOff className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-bold text-amber-100">
          {t.trial.network.banner.replace('{seconds}', graceSecondsLeft)}
        </span>
      </div>
    </div>
  );
}