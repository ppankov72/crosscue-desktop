// Phase G.2 — Terms of Service page (multilingual EN/DE/ES/BG).
// Describes real products based on server-authoritative Plan configuration.
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { legalTranslations } from '@/lib/landing/legalTranslations';
import LanguageSwitcher from '@/components/landing/LanguageSwitcher';

export default function Terms() {
  const { lang } = useI18n();
  const t = (legalTranslations[lang] || legalTranslations.en).terms;

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

        <div className="mt-8 space-y-6">
          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-stone-900">{section.h}</h2>
              {section.p && <p className="mt-2 text-stone-600 leading-relaxed">{section.p}</p>}
              {section.items && (
                <ul className="mt-2 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-stone-600 leading-relaxed">• {item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}