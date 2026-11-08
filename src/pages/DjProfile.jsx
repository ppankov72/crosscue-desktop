import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import DjAvatar from '@/components/crosscue/DjAvatar';
import { Share2, Copy, Check, Music, MapPin, ExternalLink, Crown, Globe } from 'lucide-react';

// Public DJ Profile page — /dj/:slug
// Respects visibility (backend enforced). Never exposes private data.
// Shows role badge and premium badge safely (no internal entitlement data).
export default function DjProfile() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    base44.functions.invoke('getPublicProfile', { slug })
      .then(res => {
        if (res.data?.profile) setProfile(res.data.profile);
        else setError(res.data?.error || 'not_found');
      })
      .catch(() => setError('fetch_failed'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: profile.display_name, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const shareUrl = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${profile.display_name} on CROSSCUE`);
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    };
    return links[platform];
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-950 text-center">
        <h1 className="text-2xl font-bold text-stone-200">Profile Not Found</h1>
        <p className="text-stone-500">This DJ profile is private or doesn't exist.</p>
        <Link to="/" className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700">
          Back to CROSSCUE
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Avatar + Name + Badges */}
        <div className="flex flex-col items-center gap-4 text-center">
          <DjAvatar
            type={profile.avatar_type}
            seed={profile.avatar_seed || profile.id}
            url={profile.avatar_url}
            size={120}
          />
          <div>
            <h1 className="text-3xl font-bold text-stone-100">{profile.display_name}</h1>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {profile.is_demo ? (
                <span className="inline-block rounded-full bg-stone-800 px-3 py-0.5 text-xs font-bold text-stone-400">
                  DJ DEMO
                </span>
              ) : (
                <span className="inline-block rounded-full bg-amber-900/40 px-3 py-0.5 text-xs font-bold text-amber-400">
                  DJ
                </span>
              )}
              {profile.is_premium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-700 to-yellow-600 px-3 py-0.5 text-xs font-bold text-white">
                  <Crown size={12} /> PREMIUM
                </span>
              )}
            </div>
          </div>
          {profile.bio && (
            <p className="max-w-lg text-stone-400">{profile.bio}</p>
          )}
        </div>

        {/* Meta info — only shown if user enabled field visibility */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-stone-500">
          {profile.country && (
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-amber-500" />
              <span>{profile.city ? `${profile.city}, ` : ''}{profile.country}</span>
            </div>
          )}
          {profile.genres && (
            <div className="flex items-center gap-1.5">
              <Music size={16} className="text-amber-500" />
              <span>{profile.genres}</span>
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-stone-500 hover:text-amber-500"
            >
              <Globe size={16} className="text-amber-500" />
              <span>Website</span>
            </a>
          )}
        </div>

        {/* Social links — only shown if user enabled */}
        {profile.social_links && profile.show_social_links !== false && (
          <div className="mt-6 flex justify-center gap-3">
            {profile.social_links.split(',').filter(Boolean).map((link, i) => {
              const url = link.trim();
              return (
                <a
                  key={i}
                  href={url.startsWith('http') ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800"
                >
                  <ExternalLink size={14} /> Link
                </a>
              );
            })}
          </div>
        )}

        {/* Share section */}
        <div className="mt-10 rounded-xl border border-stone-800 bg-stone-900 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-300">Share Profile</h3>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700"
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={shareUrl('facebook')} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-800">Facebook</a>
            <a href={shareUrl('whatsapp')} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-800">WhatsApp</a>
            <a href={shareUrl('telegram')} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-800">Telegram</a>
            <a href={shareUrl('x')} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-800">X</a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-800"
            >
              <Copy size={12} /> Copy Link
            </button>
          </div>
        </div>

        {/* MYFEED integration point — architecture ready, not connected */}
        <div className="mt-6 rounded-xl border border-dashed border-stone-800 bg-stone-900/50 p-8 text-center">
          <p className="text-sm text-stone-600">Community features coming soon</p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link to="/" className="text-sm text-amber-600 hover:text-amber-500">
            Powered by CROSSCUE · Vintage Virtual Turntables
          </Link>
        </div>
      </div>
    </div>
  );
}