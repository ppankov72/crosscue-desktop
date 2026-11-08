// Phase G.1 — MYFEED promotional card for the community section.
// Shows "Join MYFEED for free" CTA. Does not imply CROSSCUE owns MYFEED or that it's required.
import { Rss, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

// Configurable destination — the MYFEED public homepage.
// No verified registration URL exists in the codebase; this is the public homepage.
export const MYFEED_PUBLIC_URL = 'https://myfeed.docflowtools.de';

export default function MyFeedPromoCard() {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <Rss size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-stone-900">{t.community.myfeedTitle || 'Join MYFEED for free'}</h3>
      <p className="mt-2 text-sm text-stone-600">{t.community.myfeedDesc || 'Create a free MYFEED account and connect your DJ identity to CROSSCUE. Optional — CROSSCUE works without it.'}</p>
      <a
        href={MYFEED_PUBLIC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-amber-700 hover:text-amber-800"
      >
        {t.community.myfeedAction || 'Visit MYFEED'} <ExternalLink size={12} />
      </a>
      <p className="mt-2 text-xs text-stone-400">{t.community.myfeedNote || 'MYFEED is a separate service. Account creation is optional and free.'}</p>
    </div>
  );
}