import { Globe, Monitor, AppWindow, Apple } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/landing/i18n';

const icons = [Globe, AppWindow, Monitor, Apple];

export default function Downloads() {
  const { t } = useI18n();
  return (
    <section id="downloads" className="bg-stone-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.downloads.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.downloads.subtitle}</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.downloads.platforms.map((p, i) => {
            const Icon = icons[i];
            const available = i === 0;
            return (
              <div key={i} className={`flex flex-col rounded-2xl border p-6 text-center ${available ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl ${available ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}><Icon size={28} /></div>
                <h3 className="mt-4 text-lg font-bold text-stone-900">{p.name}</h3>
                <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${available ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{p.status}</span>
                <p className="mt-3 text-sm text-stone-600">{p.desc}</p>
                {p.version && <p className="mt-2 font-mono text-xs text-stone-500">{p.version}</p>}
                {p.minOs && <p className="text-xs text-stone-500">{p.minOs}</p>}
                {p.size && <p className="text-xs text-stone-500">{p.size}</p>}
                <div className="mt-auto pt-4">
                  {available ? (
                    <Link to="/" className="block rounded-lg bg-stone-900 py-2 text-sm font-bold text-white hover:bg-stone-800">{t.downloads.launchNow}</Link>
                  ) : (
                    <span className="block cursor-default rounded-lg border border-stone-200 py-2 text-sm font-bold text-stone-400">{t.downloads.comingSoon}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}