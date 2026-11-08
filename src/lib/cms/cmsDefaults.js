// Builds default CMS content from the existing static translations.
// Used by the admin CMS migration to seed CmsPage and CmsSetting records.
import { translations } from '@/lib/landing/translations';

const LANGS = ['en', 'de', 'es', 'bg'];

// Extract a multilingual field from translations by key path
function ml(sectionKey, field) {
  const result = {};
  for (const lang of LANGS) {
    const val = translations[lang]?.[sectionKey]?.[field];
    result[lang] = val || translations.en?.[sectionKey]?.[field] || '';
  }
  return result;
}

// Build the default home page content from translations
function buildHomeSections() {
  return [
    {
      id: 'hero', type: 'hero', enabled: true, order: 0,
      elements: {
        tagline: ml('hero', 'tagline'),
        subtitle: ml('hero', 'subtitle'),
        tryDemo: ml('hero', 'tryDemo'),
        launch: ml('hero', 'launch'),
      },
      styles: { backgroundColor: '', headingColor: '', headingFontSize: '', textColor: '', textAlign: '' }
    },
    {
      id: 'liveDemo', type: 'liveDemo', enabled: true, order: 1,
      elements: {
        title: ml('liveDemo', 'title'),
        subtitle: ml('liveDemo', 'subtitle'),
        tagline: ml('liveDemo', 'tagline'),
        openFull: ml('liveDemo', 'openFull'),
      },
      styles: {}
    },
    {
      id: 'why', type: 'why', enabled: true, order: 2,
      elements: {
        title: ml('why', 'title'),
        subtitle: ml('why', 'subtitle'),
      },
      styles: {}
    },
    {
      id: 'features', type: 'features', enabled: true, order: 3,
      elements: {
        title: ml('features', 'title'),
        subtitle: ml('features', 'subtitle'),
      },
      styles: {}
    },
    {
      id: 'demoTracks', type: 'demoTracks', enabled: true, order: 4,
      elements: {
        title: ml('demoTracks', 'title'),
        subtitle: ml('demoTracks', 'subtitle'),
        badge: ml('demoTracks', 'badge'),
        button: ml('demoTracks', 'button'),
      },
      styles: {}
    },
    {
      id: 'pricing', type: 'pricing', enabled: true, order: 5,
      elements: {
        title: ml('pricing', 'title'),
        subtitle: ml('pricing', 'subtitle'),
        popular: ml('pricing', 'popular'),
      },
      styles: {}
    },
    {
      id: 'downloads', type: 'downloads', enabled: true, order: 6,
      elements: {
        title: ml('downloads', 'title'),
        subtitle: ml('downloads', 'subtitle'),
        launchNow: ml('downloads', 'launchNow'),
        comingSoon: ml('downloads', 'comingSoon'),
      },
      styles: {}
    },
    {
      id: 'community', type: 'community', enabled: true, order: 7,
      elements: {
        title: ml('community', 'title'),
        subtitle: ml('community', 'subtitle'),
        feedTitle: ml('community', 'feedTitle'),
        feedSubtitle: ml('community', 'feedSubtitle'),
      },
      styles: {}
    },
    {
      id: 'docs', type: 'docs', enabled: true, order: 8,
      elements: {
        title: ml('docs', 'title'),
        subtitle: ml('docs', 'subtitle'),
      },
      styles: {}
    },
  ];
}

function buildNavigationSetting() {
  const navKeys = ['demo', 'why', 'features', 'tracks', 'pricing', 'downloads', 'community', 'docs'];
  const navUrls = { demo: '#demo', why: '#why', features: '#features', tracks: '#demo-tracks', pricing: '#pricing', downloads: '#downloads', community: '#community', docs: '#docs' };
  return {
    brandText: 'CROSSCUE',
    logoUrl: '',
    items: navKeys.map((key, i) => ({
      id: key,
      label: LANGS.reduce((acc, lang) => { acc[lang] = translations[lang]?.nav?.[key] || translations.en.nav[key]; return acc; }, {}),
      url: navUrls[key],
      enabled: true,
      order: i,
    })),
  };
}

function buildFooterSetting() {
  const footer = translations.en.footer;
  const columns = footer.sections.map((section, i) => ({
    id: `col-${i}`,
    title: LANGS.reduce((acc, lang) => { acc[lang] = translations[lang]?.footer?.sections?.[i]?.title || section.title; return acc; }, {}),
    links: section.links.map((link, j) => ({
      label: LANGS.reduce((acc, lang) => { acc[lang] = translations[lang]?.footer?.sections?.[i]?.links?.[j] || link; return acc; }, {}),
      url: link === 'Launch CROSSCUE' || link === 'CROSSCUE starten' || link === 'Iniciar CROSSCUE' || link === 'Стартирай CROSSCUE' ? '/studio' :
           link === 'Live Demo' || link === 'Live-Demo' || link === 'Demo en Vivo' || link === 'Демо на живо' ? '#demo' :
           link === 'Pricing' || link === 'Preise' || link === 'Precios' || link === 'Цени' ? '#pricing' :
           link === 'Downloads' || link === 'Descargas' || link === 'Изтегляния' ? '#downloads' :
           link === 'Docs & Help' || link === 'Doku & Hilfe' || link === 'Docs y Ayuda' || link === 'Документи и помощ' ? '#docs' :
           link === 'Getting Started' || link === 'Erste Schritte' || link === 'Primeros Pasos' || link === 'Първи стъпки' ? '#docs' :
           link === 'MIDI Guide' || link === 'MIDI-Leitfaden' || link === 'Guía MIDI' || link === 'MIDI ръководство' ? '#docs' :
           link === 'FAQ' || link === 'ЧЗВ' ? '#docs' :
           link === 'Report a Bug' || link === 'Bug melden' || link === 'Reportar un Bug' || link === 'Докладвай бъг' ? '#community' :
           link === 'Feature Voting' || link === 'Feature-Abstimmung' || link === 'Votación de Funciones' || link === 'Гласуване за функции' ? '#community' :
           link === 'Facebook' ? 'https://facebook.com' : '#',
    })),
  }));
  const legal = footer.legal.map((label, i) => ({
    label: LANGS.reduce((acc, lang) => { acc[lang] = translations[lang]?.footer?.legal?.[i] || label; return acc; }, {}),
    url: label === 'Privacy' || label === 'Datenschutz' || label === 'Privacidad' || label === 'Поверителност' ? '/privacy' :
         label === 'Terms' || label === 'AGB' || label === 'Términos' || label === 'Условия' ? '/terms' :
         label === 'Cookies' ? '/privacy' :
         label === 'Licensing' || label === 'Lizenzierung' || label === 'Licencias' || label === 'Лицензиране' ? '/terms' :
         label === 'Contact' || label === 'Kontakt' || label === 'Contacto' || label === 'Контакт' ? '/contact' : '#',
  }));
  return {
    tagline: ml('footer', 'tagline'),
    subtitle: ml('footer', 'subtitle'),
    rights: ml('footer', 'rights'),
    columns,
    legal,
  };
}

function buildThemeSetting() {
  return {
    colors: {
      background: '#fafaf9',
      contentBg: '#ffffff',
      primary: '#d97706',
      secondary: '#1c1917',
      accent: '#f59e0b',
      text: '#44403c',
      heading: '#1c1917',
      muted: '#78716c',
      border: '#e7e5e4',
    },
    typography: {
      body: { family: '', size: '', weight: '', lineHeight: '' },
      heading: { family: '', size: '', weight: '', lineHeight: '', letterSpacing: '', textTransform: '' },
      navigation: { family: '', size: '', weight: '' },
      button: { family: '', size: '', weight: '' },
      footer: { family: '', size: '', weight: '' },
    },
  };
}

// Build the full default CMS content for migration
export function buildDefaultCmsContent() {
  return {
    pages: [
      {
        slug: '/',
        title: 'Home',
        nav_visible: false,
        footer_visible: false,
        display_order: 0,
        draft_content: { sections: buildHomeSections() },
      },
      {
        slug: '/privacy',
        title: 'Privacy Policy',
        nav_visible: false,
        footer_visible: true,
        display_order: 10,
        draft_content: { sections: [] },
      },
      {
        slug: '/terms',
        title: 'Terms of Service',
        nav_visible: false,
        footer_visible: true,
        display_order: 11,
        draft_content: { sections: [] },
      },
      {
        slug: '/impressum',
        title: 'Impressum',
        nav_visible: false,
        footer_visible: true,
        display_order: 12,
        draft_content: { sections: [] },
      },
      {
        slug: '/contact',
        title: 'Contact',
        nav_visible: false,
        footer_visible: true,
        display_order: 13,
        draft_content: { sections: [] },
      },
    ],
    settings: {
      navigation: buildNavigationSetting(),
      footer: buildFooterSetting(),
      theme: buildThemeSetting(),
    },
  };
}

// Extract a single language's content from the CMS page JSON.
// Converts { elements: { tagline: { en, de, es, bg } } } to { tagline: "..." } for the given language.
export function extractCmsContent(cmsContent, lang) {
  if (!cmsContent || !cmsContent.sections) return {};
  const result = {};
  for (const section of cmsContent.sections) {
    const sectionContent = {};
    if (section.elements) {
      for (const [key, value] of Object.entries(section.elements)) {
        if (value && typeof value === 'object' && value[lang]) {
          sectionContent[key] = value[lang];
        } else if (value && typeof value === 'object' && value.en) {
          sectionContent[key] = value.en;
        } else if (typeof value === 'string') {
          sectionContent[key] = value;
        }
      }
    }
    result[section.id] = sectionContent;
  }
  return result;
}

// Get the ordered list of enabled section types from CMS content
export function getEnabledSections(cmsContent) {
  if (!cmsContent || !cmsContent.sections) return [];
  return cmsContent.sections
    .filter(s => s.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}