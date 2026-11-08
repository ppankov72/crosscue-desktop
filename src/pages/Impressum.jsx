// Phase G.1 — Impressum page (German legal notice).
// All operator fields are configurable placeholders — no fake data.
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { legalTranslations } from '@/lib/landing/legalTranslations';
import LanguageSwitcher from '@/components/landing/LanguageSwitcher';

export default function Impressum() {
  const { lang } = useI18n();
  const t = (legalTranslations[lang] || legalTranslations.en).impressum;

  const fields = [
    { label: t.operatorName, value: '', placeholder: '[Operator name — to be configured]' },
    { label: t.legalForm, value: '', placeholder: '[Legal form — to be configured]' },
    { label: t.address, value: '', placeholder: '[Postal address — to be configured]' },
    { label: t.representative, value: '', placeholder: '[Responsible representative — to be configured]' },
    { label: t.email, value: '', placeholder: '[Email — to be configured]' },
    { label: t.phone, value: '', placeholder: '[Telephone — to be configured if required]' },
    { label: t.commercialRegister, value: '', placeholder: '[Commercial register — to be configured if applicable]' },
    { label: t.registrationNumber, value: '', placeholder: '[Registration number — to be configured if applicable]' },
    { label: t.vatId, value: '', placeholder: '[VAT ID — to be configured if applicable]' },
    { label: t.responsibleContent, value: '', placeholder: '[Responsible person for content — to be configured]' },
  ];

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

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-stone-700">{t.configNote}</p>
        </div>

        <div className="mt-8 space-y-4">
          {fields.map((field, i) => (
            <div key={i} className="border-b border-stone-200 pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{field.label}</p>
              <p className="mt-1 text-stone-900">{field.value || <span className="text-stone-400 italic">{field.placeholder}</span>}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}