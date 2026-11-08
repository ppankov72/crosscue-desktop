import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import MyFeedPromo from '@/components/MyFeedPromo';
import { LanguageProvider } from '@/lib/landing/i18n';
import { ConsentProvider, useConsent } from '@/lib/landing/consentContext';
import CookieConsentBanner from '@/components/landing/CookieConsentBanner';
import { legalTranslations } from '@/lib/landing/legalTranslations';
import { useI18n } from '@/lib/landing/i18n';

// Public CROSSCUE entry page — lightweight front door.
// Shows SIGN UP / SIGN IN for unauthenticated users.
// Shows OPEN CROSSCUE / GO TO PORTAL for authenticated users.
function LegalFooter() {
  const { lang } = useI18n();
  const { openSettings } = useConsent();
  const lt = (legalTranslations[lang] || legalTranslations.en).footer;
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4 text-xs text-stone-500">
        <Link to="/impressum" className="hover:text-amber-700">{lt.impressum}</Link>
        <Link to="/privacy" className="hover:text-amber-700">{lt.privacy}</Link>
        <button onClick={openSettings} className="hover:text-amber-700">{lt.cookieSettings}</button>
        <Link to="/terms" className="hover:text-amber-700">{lt.terms}</Link>
        <Link to="/contact" className="hover:text-amber-700">{lt.contact}</Link>
        <span>© {new Date().getFullYear()} CROSSCUE</span>
      </div>
    </footer>
  );
}

function WelcomeContent() {
  const { isAuthenticated } = useAuth();
  const [myfeedLinked, setMyfeedLinked] = useState(false);
  const [checkingMyFeed, setCheckingMyFeed] = useState(false);

  // For authenticated users, check MYFEED linked status (lightweight)
  useEffect(() => {
    if (!isAuthenticated) return;
    setCheckingMyFeed(true);
    base44.functions.invoke('getMyFeedProfile', {})
      .then(res => setMyfeedLinked(Boolean(res.data?.profile)))
      .catch(() => setMyfeedLinked(false))
      .finally(() => setCheckingMyFeed(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Minimal nav */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE</span>
          <Link to="/landing" className="text-sm font-medium text-stone-500 hover:text-amber-700">
            Learn more
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900">
          <Disc3 size={32} className="text-amber-500" />
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          CROSSCUE
        </h1>
        <p className="mt-3 text-lg font-medium text-stone-600">
          Vintage Virtual Turntables
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500">
          Mix tracks with dual realistic turntables, analog VU meters, and a precise audio engine.
        </p>

        {/* Actions */}
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/studio"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-stone-800"
              >
                OPEN CROSSCUE <ArrowRight size={16} />
              </Link>
              <Link
                to="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
              >
                GO TO PORTAL
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-stone-800"
              >
                <UserPlus size={16} /> SIGN UP
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
              >
                <LogIn size={16} /> SIGN IN
              </Link>
            </>
          )}
        </div>
      </div>

      {/* MYFEED promotion */}
      <div className="mx-auto max-w-2xl px-6 pb-16">
        {checkingMyFeed ? (
          <div className="flex items-center justify-center py-4 text-stone-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <MyFeedPromo linked={myfeedLinked} />
        )}
      </div>
      <LegalFooter />
      <CookieConsentBanner />
    </div>
  );
}

export default function Welcome() {
  return <LanguageProvider><ConsentProvider><WelcomeContent /></ConsentProvider></LanguageProvider>;
}