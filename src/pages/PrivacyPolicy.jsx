// Phase G.1 — Multilingual Privacy Policy page (DE/EN/BG).
// Describes the ACTUAL CROSSCUE implementation — no generic boilerplate.
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { legalTranslations } from '@/lib/landing/legalTranslations';
import LanguageSwitcher from '@/components/landing/LanguageSwitcher';

export default function PrivacyPolicy() {
  const { lang } = useI18n();
  const t = (legalTranslations[lang] || legalTranslations.en).privacy;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link to="/landing" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-amber-700">
            <ArrowLeft size={14} /> Back
          </Link>
          <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE</span>
          <LanguageSwitcher />
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900">{t.title}</h1>
        <p className="mt-2 text-stone-500">{t.subtitle}</p>
        <p className="mt-2 text-xs text-stone-400">{t.lastUpdated}: {t.date}</p>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-stone-700">{t.configNote}</p>
        </div>

        <div className="mt-8 space-y-6">
          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-stone-900">{section.h}</h2>
              <p className="mt-2 text-stone-600 leading-relaxed">{section.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}