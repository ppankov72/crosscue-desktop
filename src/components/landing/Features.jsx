import { Disc3, Library, Activity, Radio, Waves, Mic } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

const icons = [Disc3, Library, Activity, Radio, Waves, Mic];

export default function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="bg-stone-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.features.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.features.subtitle}</p>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {t.features.categories.map((cat, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon size={20} /></div>
                  <h3 className="text-xl font-bold text-stone-900">{cat.title}</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-stone-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}