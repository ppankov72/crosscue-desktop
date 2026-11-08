import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import CrossCue from '@/pages/CrossCue';

// Prevents the CrossCue global theme side-effect (html[data-crosscue-theme])
// from darkening the landing page body, while keeping the component's own
// .crosscue-app[data-crosscue-theme] scoped styling intact.
function useIsolateCrossCueTheme() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.crosscueTheme) delete html.dataset.crosscueTheme;
    const observer = new MutationObserver(() => {
      if (html.dataset.crosscueTheme) delete html.dataset.crosscueTheme;
    });
    observer.observe(html, { attributes: true, attributeFilter: ['data-crosscue-theme'] });
    return () => observer.disconnect();
  }, []);
}

export default function LiveDemo() {
  const { t } = useI18n();
  const frameRef = useRef(null);
  useIsolateCrossCueTheme();

  return (
    <section id="demo" className="bg-stone-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.liveDemo.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.liveDemo.subtitle}</p>
        <p className="mt-4 text-center text-base font-semibold text-amber-700">{t.liveDemo.tagline}</p>
        <div className="mt-8 overflow-hidden rounded-2xl border-2 border-stone-300 bg-stone-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-700 bg-stone-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <Link to="/studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300">
              {t.liveDemo.openFull} <ExternalLink size={14} />
            </Link>
          </div>
          <div ref={frameRef} className="live-demo-frame relative h-[640px] w-full overflow-hidden bg-stone-900">
            <CrossCue embedded />
          </div>
        </div>
      </div>
    </section>
  );
}