import { useEffect, useRef } from 'react';

const getVideoId = url => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
  } catch { return ''; }
};

const loadApi = () => new Promise(resolve => {
  if (window.YT?.Player) return resolve(window.YT);
  const previous = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  }
});

export default function YouTubePlayer({ deckId, url, visible, onReady, onProgress }) {
  const hostRef = useRef(null), playerRef = useRef(null);
  const videoId = getVideoId(url);

  useEffect(() => {
    if (!videoId || !hostRef.current) return;
    let disposed = false, poll;
    loadApi().then(YT => {
      if (disposed || !hostRef.current) return;
      const player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: event => {
            if (disposed) return;
            onReady(event.target);
            poll = window.setInterval(() => {
              if (disposed) { window.clearInterval(poll); return; }
              try {
                onProgress({ elapsed: event.target.getCurrentTime() || 0, duration: event.target.getDuration() || 0, playing: event.target.getPlayerState() === YT.PlayerState.PLAYING });
              } catch { window.clearInterval(poll); }
            }, 250);
          },
          onStateChange: event => {
            if (disposed) return;
            try {
              onProgress({ elapsed: event.target.getCurrentTime() || 0, duration: event.target.getDuration() || 0, playing: event.data === YT.PlayerState.PLAYING });
            } catch {}
          }
        }
      });
      playerRef.current = player;
    });
    return () => { disposed = true; window.clearInterval(poll); try { playerRef.current?.destroy?.(); } catch {} playerRef.current = null; };
  }, [videoId]);

  return <div className={`mt-2 h-20 w-full overflow-hidden border border-[#5f543d] bg-black ${visible ? '' : 'pointer-events-none opacity-0'}`}><div aria-label={`YouTube player for Deck ${deckId}`} ref={hostRef} className="h-full w-full" /></div>;
}