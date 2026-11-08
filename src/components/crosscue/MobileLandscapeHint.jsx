import { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { useTrialI18n } from '@/lib/landing/i18n';
import { translations } from '@/lib/landing/translations';

const DISMISS_KEY = 'crosscue-landscape-hint-dismissed';

export default function MobileLandscapeHint({ visible }) {
  const { t } = useTrialI18n();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!visible || dismissed) return null;

  const fallback = translations.en.mobileHint;
  const hint = t?.mobileHint || fallback;
  const tipLabel = hint?.tip || fallback.tip;
  const tipText = hint?.text || fallback.text;
  const dismissLabel = hint?.dismiss || fallback.dismiss;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <div
      data-landscape-hint
      className="mb-2 flex items-center justify-between gap-2 rounded border border-[#625a49] bg-[#1a1916]/90 px-2.5 py-1.5 text-[11px] text-[#e8dec5]"
    >
      <span className="flex items-center gap-1.5">
        <Smartphone size={13} className="shrink-0 rotate-90 text-[#d5ad58]" />
        <span>
          <strong>{tipLabel}</strong> {tipText}
        </span>
      </span>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-[#a49778] hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}