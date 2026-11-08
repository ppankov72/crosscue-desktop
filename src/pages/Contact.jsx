// Phase G.2 — Contact page with real CROSSCUE contact information.
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { legalTranslations } from '@/lib/landing/legalTranslations';
import LanguageSwitcher from '@/components/landing/LanguageSwitcher';

export const CROSSCUE_CONTACT = {
  email: 'info@crosscue.de',
  phone: '+49 155 62144381',
  phoneDisplay: '+49 155 62144381',
  whatsapp: 'https://wa.me/4915562144381',
};

export default function Contact() {
  const { lang } = useI18n();
  const t = (legalTranslations[lang] || legalTranslations.en).contact;

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
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900">{t.title}</h1>
        <p className="mt-2 text-stone-500">{t.subtitle}</p>

        <div className="mt-8 space-y-4">
          <a href={`mailto:${CROSSCUE_CONTACT.email}`} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{t.emailLabel}</p>
              <p className="text-lg font-bold text-stone-900">{CROSSCUE_CONTACT.email}</p>
            </div>
          </a>

          <a href={`tel:${CROSSCUE_CONTACT.phone.replace(/\s/g, '')}`} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Phone size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{t.phoneLabel}</p>
              <p className="text-lg font-bold text-stone-900">{CROSSCUE_CONTACT.phoneDisplay}</p>
            </div>
          </a>

          <a href={CROSSCUE_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 transition hover:border-green-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <MessageCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{t.whatsappLabel}</p>
              <p className="text-lg font-bold text-stone-900">{CROSSCUE_CONTACT.phoneDisplay}</p>
            </div>
          </a>
        </div>

        <p className="mt-8 text-sm text-stone-500">{t.note}</p>
      </main>
    </div>
  );
}