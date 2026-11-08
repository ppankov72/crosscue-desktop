// Phase G.1 — Facebook Community card.
// Links to the official CROSSCUE Facebook page. No scraping, no fake comments, no SDK.
import { Facebook, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

// Configurable URL — can later be replaced with a cleaner username URL.
export const CROSSCUE_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61593134591792';

export default function FacebookCommunityCard() {
  const { t } = useI18n();
  const item = t.community.items[2]; // Facebook card from translations

  return (
    <a
      href={CROSSCUE_FACEBOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:border-blue-400 hover:shadow-lg"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
        <Facebook size={24} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-stone-900">{t.community.facebookTitle || 'Facebook Community'}</h3>
      <p className="mt-2 text-sm text-stone-600">{t.community.facebookDesc || 'Follow CROSSCUE on Facebook for updates, discussions and community posts.'}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
        {t.community.facebookAction || 'Visit Facebook'} <ExternalLink size={12} />
      </span>
    </a>
  );
}