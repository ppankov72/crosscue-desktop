// Analytics shared helpers — traffic source detection and event utilities.
// Used by: logAnalyticsEvent, getAnalyticsV2

// Known search engine domains for organic traffic classification
const SEARCH_ENGINES = [
  'google.', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com',
  'yandex.ru', 'ecosia.org', 'startpage.com', 'searx.org', 'qwant.com'
];

// Known social media domains
const SOCIAL_DOMAINS = [
  'facebook.com', 'fb.com', 'twitter.com', 'x.com', 'instagram.com',
  'linkedin.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'reddit.com',
  'pinterest.com', 'snapchat.com', 'discord.com', 't.me', 'whatsapp.com'
];

// Known email/webmail domains (referral from email client web interface)
const EMAIL_DOMAINS = [
  'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'mail.yahoo.com',
  'web.de', 'gmx.net', 't-online.de', 'protonmail.com', 'icloud.com'
];

// Extract the registrable domain from a full URL.
// e.g. "https://www.google.com/search?q=foo" → "google.com"
function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // For co.uk, com.au etc. take last 3 parts; otherwise last 2
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    if (['co.uk', 'com.au', 'co.jp', 'com.br'].includes(parts.slice(-2).join('.'))) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

export interface TrafficSource {
  source: string;       // organic | direct | referral | social | email | paid | none
  detail: string;       // domain or medium identifier
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

// Classify traffic source from referrer URL and UTM parameters.
// Priority: UTM params (paid/referral) → referrer domain → direct
export function classifyTrafficSource(
  referrer: string,
  utm?: { source?: string; medium?: string; campaign?: string }
): TrafficSource {
  const utmSource = utm?.source || '';
  const utmMedium = utm?.medium || '';
  const utmCampaign = utm?.campaign || '';

  // UTM params present → paid or referral based on medium
  if (utmSource || utmMedium) {
    const medium = utmMedium.toLowerCase();
    if (['cpc', 'ppc', 'paid', 'paidsearch', 'paid-social'].includes(medium)) {
      return { source: 'paid', detail: utmSource || utmMedium, utmSource, utmMedium, utmCampaign };
    }
    if (['email', 'newsletter', 'e-mail'].includes(medium)) {
      return { source: 'email', detail: utmSource || medium, utmSource, utmMedium, utmCampaign };
    }
    if (['social', 'social-network', 'social-media'].includes(medium)) {
      return { source: 'social', detail: utmSource || medium, utmSource, utmMedium, utmCampaign };
    }
    // Default for other UTM-tagged links (affiliate, partner, etc.)
    return { source: 'referral', detail: utmSource || utmMedium, utmSource, utmMedium, utmCampaign };
  }

  // No referrer → direct
  if (!referrer || referrer === '') {
    return { source: 'direct', detail: '', utmSource, utmMedium, utmCampaign };
  }

  // Same-origin referrer (internal navigation) → direct
  try {
    const refUrl = new URL(referrer);
    if (refUrl.origin === refUrl.origin) {
      // Will be compared against app origin by caller; if same, it's direct
    }
  } catch {}

  const domain = extractDomain(referrer);
  if (!domain) {
    return { source: 'direct', detail: '', utmSource, utmMedium, utmCampaign };
  }

  // Check search engines
  for (const se of SEARCH_ENGINES) {
    if (domain.includes(se.replace('.', '')) || referrer.includes(se)) {
      return { source: 'organic', detail: domain, utmSource, utmMedium, utmCampaign };
    }
  }

  // Check social media
  for (const soc of SOCIAL_DOMAINS) {
    if (domain.includes(soc) || referrer.includes(soc)) {
      return { source: 'social', detail: domain, utmSource, utmMedium, utmCampaign };
    }
  }

  // Check email/webmail
  for (const em of EMAIL_DOMAINS) {
    if (domain.includes(em) || referrer.includes(em)) {
      return { source: 'email', detail: domain, utmSource, utmMedium, utmCampaign };
    }
  }

  // Everything else with a referrer → referral
  return { source: 'referral', detail: domain, utmSource, utmMedium, utmCampaign };
}

// Generate a session ID (per browser tab, stored in sessionStorage)
export function generateSessionId(): string {
  return 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}