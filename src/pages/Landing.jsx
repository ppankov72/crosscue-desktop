import { Link } from 'react-router-dom';
import { ExternalLink, UserCircle } from 'lucide-react';
import { LanguageProvider, useI18n } from '@/lib/landing/i18n';
import { getEnabledSections } from '@/lib/cms/cmsDefaults';
import LanguageSwitcher from '@/components/landing/LanguageSwitcher';
import { base44 } from '@/api/base44Client';
import Hero from '@/components/landing/Hero';
import LiveDemo from '@/components/landing/LiveDemo';
import WhyCrossCue from '@/components/landing/WhyCrossCue';
import Features from '@/components/landing/Features';
import DemoTracks from '@/components/landing/DemoTracks';
import Pricing from '@/components/landing/Pricing';
import Downloads from '@/components/landing/Downloads';
import CommunityFeed from '@/components/landing/CommunityFeed';
import Docs from '@/components/landing/Docs';
import SiteFooter from '@/components/landing/SiteFooter';
import CookieConsentBanner from '@/components/landing/CookieConsentBanner';
import { ConsentProvider } from '@/lib/landing/consentContext';
import useSessionLogger from '@/hooks/useSessionLogger';
import { useState, useEffect } from 'react';

function LandingContent() {
  const { t, lang, managedLoaded, cmsPage, cmsSettings } = useI18n();
  useSessionLogger('/landing');
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { base44.auth.isAuthenticated().then(setAuthenticated); }, []);

  // Apply SEO / Meta from managed content (if published SEO exists for this language)
  useEffect(() => {
    if (!managedLoaded) return;
    const seo = t?.seo;
    if (!seo || typeof seo !== 'object') return;
    if (seo.title) document.title = seo.title;
    if (seo.description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', seo.description);
    }
    if (seo.ogImage) {
      let og = document.querySelector('meta[property="og:image"]');
      if (!og) {
        og = document.createElement('meta');
        og.setAttribute('property', 'og:image');
        document.head.appendChild(og);
      }
      og.setAttribute('content', seo.ogImage);
    }
  }, [t?.seo, managedLoaded]);

  const cmsNavItems = cmsSettings?.navigation?.items?.filter(i => i.enabled !== false) || [];
  const navLinks = cmsNavItems.length > 0
    ? cmsNavItems.map(item => ({ href: item.url, label: item.label?.[lang] || item.label?.en || '' }))
    : [
        { href: '#demo', label: t.nav.demo },
        { href: '#why', label: t.nav.why },
        { href: '#features', label: t.nav.features },
        { href: '#demo-tracks', label: t.nav.tracks },
        { href: '#pricing', label: t.nav.pricing },
        { href: '#downloads', label: t.nav.downloads },
        { href: '#community', label: t.nav.community },
        { href: '#docs', label: t.nav.docs },
      ];
  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <a href="#" className="font-serif text-xl font-bold tracking-wider text-stone-900">{cmsSettings?.navigation?.brandText || 'CROSSCUE'}</a>
          <div className="order-3 hidden w-full items-center justify-center gap-6 lg:flex xl:order-none xl:w-auto">
            {navLinks.map(l => <a key={l.href} href={l.href} className="text-sm font-medium text-stone-600 hover:text-amber-700">{l.label}</a>)}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {authenticated ? (
              <>
                <Link to="/portal" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                  <UserCircle size={14} /> Portal
                </Link>
                <Link to="/studio" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                  <ExternalLink size={14} /> Studio
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                  Sign in
                </Link>
                <Link to="/register" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
                  Sign up
                </Link>
              </>
            )}
            <Link to="/studio" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-5 py-2 text-sm font-bold text-white hover:bg-stone-800">
              {t.nav.launch} <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </nav>
      {(() => {
        const SECTION_COMPONENTS = { hero: Hero, liveDemo: LiveDemo, why: WhyCrossCue, features: Features, demoTracks: DemoTracks, pricing: Pricing, downloads: Downloads, community: CommunityFeed, docs: Docs };
        const sections = getEnabledSections(cmsPage?.content);
        if (sections.length > 0) {
          return sections.map(section => {
            const Component = SECTION_COMPONENTS[section.type];
            return Component ? <Component key={section.id} /> : null;
          });
        }
        return (<><Hero /><LiveDemo /><WhyCrossCue /><Features /><DemoTracks /><Pricing /><Downloads /><CommunityFeed /><Docs /></>);
      })()}
      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}

export default function Landing() {
  return <LanguageProvider><ConsentProvider><LandingContent /></ConsentProvider></LanguageProvider>;
}