import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/landing/i18n';
import { DEMO_TRACKS } from '@/lib/crosscue/defaultDemoTracks';

export default function DemoTracks() {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  const togglePlay = (track) => {
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(track.url);
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    audio.play().catch(() => {});
    setPlaying(track.id);
  };

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  return (
    <section id="demo-tracks" className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.demoTracks.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.demoTracks.subtitle}</p>
        <div className="mt-10 overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
          {DEMO_TRACKS.map((track, i) => (
            <div key={track.id} className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 ${i % 2 ? 'bg-stone-50' : 'bg-white'} border-b border-stone-100 last:border-0`}>
              <button onClick={() => togglePlay(track)} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 transition hover:bg-amber-200">
                {playing === track.id ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-stone-900">{track.name}</p>
                <p className="truncate text-sm text-stone-500">{t.demoTracks.badge}</p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link to={`/?demoTrack=${track.id}&deck=A`} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-amber-400 hover:text-amber-700">
                  {t.demoTracks.loadA}
                </Link>
                <Link to={`/?demoTrack=${track.id}&deck=B`} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-amber-400 hover:text-amber-700">
                  {t.demoTracks.loadB}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-lg font-bold text-white shadow-lg transition hover:bg-amber-600">
            <Play size={20} /> {t.demoTracks.button}
          </Link>
        </div>
      </div>
    </section>
  );
}