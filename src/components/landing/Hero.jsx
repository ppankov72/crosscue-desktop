import { Link } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';

export default function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-100 via-amber-50 to-stone-50 pt-10 pb-10">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h1 className="font-serif text-5xl font-bold tracking-[.15em] text-stone-900 sm:text-6xl">CROSSCUE</h1>
        <p className="mt-3 text-xl font-semibold text-amber-700 sm:text-2xl">{t.hero.tagline}</p>
        <div className="mt-4 inline-block rounded-full border border-amber-300 bg-amber-100 px-5 py-2">
          <p className="text-base font-semibold text-amber-800">{t.hero.subtitle}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-lg font-bold text-white shadow-lg transition hover:bg-amber-600 hover:shadow-xl">
            <Play size={20} /> {t.hero.tryDemo}
          </Link>
          <Link to="/studio" className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-8 py-3.5 text-lg font-bold text-white shadow-lg transition hover:bg-stone-800 hover:shadow-xl">
            {t.hero.launch} <ArrowRight size={20} />
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-4xl px-6">
        <div className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-stone-700 bg-stone-800 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs font-medium text-stone-400">crosscue.app</span>
          </div>
          <video autoPlay loop muted playsInline poster="https://media.base44.com/images/public/6a79fe2cc75208fe240db246/1fa42d40c_generated_image.png" className="aspect-video w-full object-cover">
            <source src="https://media.base44.com/videos/public/6a79fe2cc75208fe240db246/e5b874c8c_CrossCue_Hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}