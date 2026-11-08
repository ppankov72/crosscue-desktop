import { useEffect, useRef } from 'react';
import { Disc3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTrialI18n } from '@/lib/landing/i18n';

function fmt(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Small, non-intrusive trial status indicator.
// Shows: DJ {nickname} · FREE SESSION · {mm:ss} LEFT
// Fires one toast at 10 min and one at 5 min remaining (non-blocking).
export default function TrialStatusIndicator({ nickname, remainingSeconds, entitlementType, active }) {
  const { toast } = useToast();
  const { t } = useTrialI18n();
  const tr = t.trial.status;
  const warned10 = useRef(false);
  const warned5 = useRef(false);

  useEffect(() => {
    if (entitlementType !== 'trial' && entitlementType !== 'public_demo') return;
    if (remainingSeconds <= 0) return;
    if (remainingSeconds <= 600 && !warned10.current) {
      warned10.current = true;
      toast({ title: 'CROSSCUE', description: tr.warn10, duration: 6000 });
    }
    if (remainingSeconds <= 300 && !warned5.current) {
      warned5.current = true;
      toast({ title: 'CROSSCUE', description: tr.warn5, duration: 7000 });
    }
  }, [remainingSeconds, entitlementType, toast, tr]);

  if (!active) return null;
  if (entitlementType !== 'trial' && entitlementType !== 'public_demo') return null;

  const low = remainingSeconds > 0 && remainingSeconds <= 300;

  return (
    <div className="flex items-center gap-2 text-xs">
      <Disc3 size={12} className="text-amber-400" />
      <span className="font-bold tracking-wide text-stone-200">{nickname || 'DJ'}</span>
      <span className="text-stone-500">·</span>
      <span className="text-stone-400">{tr.freeSession}</span>
      <span className="text-stone-500">·</span>
      <span className={`font-mono font-bold tabular-nums ${low ? 'text-amber-400' : 'text-stone-300'}`}>{fmt(remainingSeconds)} {tr.left}</span>
    </div>
  );
}