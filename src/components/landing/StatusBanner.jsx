import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

export default function StatusBanner() {
  const { t } = useI18n();
  return (
    <section id="status" className="bg-stone-900 py-16">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <h2 className="text-2xl font-bold text-white">{t.status.title}</h2>
          </div>
          <p className="text-stone-400">{t.status.subtitle}</p>
          <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
            {t.status.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-stone-700 bg-stone-800 px-5 py-3">
                <span className="text-stone-300">{s.name}</span>
                <span className="flex items-center gap-2 text-sm font-bold text-green-400"><ShieldCheck size={16} /> {s.status}</span>
              </div>
            ))}
          </div>
          <a href="#status" className="mt-6 text-sm font-bold text-amber-400 hover:text-amber-300">{t.status.viewFull}</a>
        </div>
      </div>
    </section>
  );
}