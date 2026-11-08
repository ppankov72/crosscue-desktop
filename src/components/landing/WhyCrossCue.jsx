import { Wifi, Disc3, Library, Radio, SlidersHorizontal, Monitor } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

const icons = [Wifi, Disc3, Library, Radio, SlidersHorizontal, Monitor];

export default function WhyCrossCue() {
  const { t } = useI18n();
  return (
    <section id="why" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.why.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.why.subtitle}</p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {t.why.points.map((point, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:border-amber-400 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Icon size={24} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-stone-900">{point.title}</h3>
                <p className="mt-2 text-stone-600">{point.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}