// CROSSCUE Marketing Center — shared constants
// Channels, objectives, segments, brand messaging, and campaign templates.

export const CHANNELS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'google', label: 'Google' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'email', label: 'Email' },
  { id: 'community', label: 'Community' },
  { id: 'referral', label: 'Referral' },
  { id: 'direct', label: 'Direct' },
  { id: 'partner', label: 'Partner' },
  { id: 'event', label: 'Event' },
  { id: 'other', label: 'Other' },
];

export const OBJECTIVES = [
  { id: 'awareness', label: 'Awareness' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'registration', label: 'Registration' },
  { id: 'trial', label: 'Trial' },
  { id: 'weekend_pass', label: 'Weekend Pass' },
  { id: 'premium', label: 'Premium' },
  { id: 'community_engagement', label: 'Community Engagement' },
  { id: 'retention', label: 'Retention' },
  { id: 'other', label: 'Other' },
];

export const CAMPAIGN_STATUS = [
  { id: 'idea', label: 'Idea', color: 'bg-stone-100 text-stone-600' },
  { id: 'draft', label: 'Draft', color: 'bg-blue-100 text-blue-700' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
  { id: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { id: 'paused', label: 'Paused', color: 'bg-amber-100 text-amber-700' },
  { id: 'finished', label: 'Finished', color: 'bg-stone-200 text-stone-700' },
  { id: 'archived', label: 'Archived', color: 'bg-stone-100 text-stone-400' },
];

export const DJ_SEGMENTS = [
  'Beginner DJ',
  'Bedroom / Home DJ',
  'Party DJ',
  'Mobile DJ',
  'Controller Owner',
  'Laptop-only DJ',
  'Professional DJ',
  'Producer / DJ',
];

export const MARKETS = [
  { code: 'DE', label: 'Germany', language: 'de', currency: 'EUR' },
  { code: 'BG', label: 'Bulgaria', language: 'bg', currency: 'EUR' },
  { code: 'EU', label: 'EU (EN)', language: 'en', currency: 'EUR' },
  { code: 'UK', label: 'United Kingdom', language: 'en', currency: 'GBP' },
  { code: 'US', label: 'USA', language: 'en', currency: 'USD' },
  { code: 'ES', label: 'Spain', language: 'es', currency: 'EUR' },
  { code: 'FR', label: 'France', language: 'fr', currency: 'EUR' },
  { code: 'IT', label: 'Italy', language: 'it', currency: 'EUR' },
  { code: 'NL', label: 'Netherlands', language: 'nl', currency: 'EUR' },
  { code: 'PL', label: 'Poland', language: 'pl', currency: 'PLN' },
  { code: 'BR', label: 'Brazil', language: 'pt', currency: 'BRL' },
  { code: 'JP', label: 'Japan', language: 'ja', currency: 'JPY' },
  { code: 'GLOBAL', label: 'Global', language: 'en', currency: 'EUR' },
];

export const BRAND_MESSAGES = [
  // Primary advertising slogans
  { id: 'wanna-be-dj', message: 'Wanna be a DJ? Choose CROSSCUE!', usage: 'Primary campaign headline' },
  { id: 'own-the-party', message: 'Be the DJ. Own the party.', usage: 'Primary campaign headline' },
  { id: 'first-setup', message: 'Your first DJ setup. Right in your browser.', usage: 'Young DJs & Students' },
  { id: 'no-expensive-controller', message: 'No expensive controller. No installation. Just mix.', usage: 'Accessible hardware alternative' },
  { id: 'free-no-limit', message: 'Free DJ mixing. No time limit.', usage: 'Free Core positioning' },
  { id: 'your-music-rules', message: 'Your Music. Your Mix. Your Rules.', usage: 'Core brand value' },
  { id: 'try-premium-40', message: 'Try Premium features free for 40 minutes.', usage: 'Premium Trial promotion' },
  { id: 'built-for-djs', message: 'Built for DJs. Not for algorithms.', usage: 'Secondary brand tagline' },
  { id: 'weekend-power', message: 'Your full DJ setup for the weekend. €4.99.', usage: 'Weekend Pass' },
  { id: 'browser-workspace', message: 'Your complete DJ workspace. In the browser.', usage: 'Feature summary' },
  { id: 'local-youtube', message: 'Local files. YouTube links. One mixer.', usage: 'Feature highlight' },
];

// Prepared campaign messaging for future segmented landing pages (/party, /schule, /start)
export const FUTURE_PAGE_MESSAGES = [
  {
    route: '/party',
    target: 'House & Student Party DJ',
    headline: 'Rock your house party directly from your laptop.',
    subheadline: 'Wanna be the star of the night? Plug in your speakers, load your tracks and keep the dancefloor alive with CROSSCUE — 100% free with no time limits.',
    keyPoints: [
      'Zero cost setup — no 1000€ controller needed',
      'Dual turntables, EQ, crossfader and smooth transitions',
      'Weekend Pass available for 72h recording & cloud streaming'
    ],
    primaryCta: 'BECOME THE PARTY DJ',
  },
  {
    route: '/schule',
    target: 'School & College Events',
    headline: 'Your school & college parties need a real DJ. Be that DJ.',
    subheadline: 'Organizing a prom, school festival or campus bash? CROSSCUE gives you an authentic DJ setup right in your browser with zero budget barrier.',
    keyPoints: [
      'Runs instantly on any laptop or school computer',
      'No installation required, no IT admin approval needed',
      'Mix local tracks and practice beatmatching for free'
    ],
    primaryCta: 'START MIXING FREE',
  },
  {
    route: '/start',
    target: 'Beginner DJ Quickstart',
    headline: 'Wanna be a DJ? Start here in 10 seconds.',
    subheadline: 'Don’t wait until you can afford expensive DJ hardware. Load your favorite songs, learn scratching and beat transitions, and play your first set today.',
    keyPoints: [
      'Free Core: 100% free local mixing with no time limit',
      'Premium Trial: 40 minutes of advanced features after signup',
      'Your music, your mix, your rules'
    ],
    primaryCta: 'LAUNCH CROSSCUE NOW',
  },
];

export const CAMPAIGN_TEMPLATES = [
  {
    name: 'Free Core DJ — No Time Limit',
    message: 'Free DJ mixing. No installation. No time limit.',
    objective: 'trial',
    cta: 'START MIXING FREE',
    landing_destination: '/studio',
    channel: 'google',
  },
  {
    name: 'Be the DJ — Own the Party',
    message: 'No expensive controller. No installation. Just mix.',
    objective: 'traffic',
    cta: 'BECOME THE DJ',
    landing_destination: '/studio',
    channel: 'facebook',
  },
  {
    name: 'Young DJ Quickstart',
    message: 'Wanna be a DJ? Choose CROSSCUE!',
    objective: 'awareness',
    cta: 'LAUNCH CROSSCUE',
    landing_destination: '/studio',
    channel: 'tiktok',
  },
  {
    name: 'Weekend Pass — Party Setup',
    message: 'Your full DJ setup for the weekend. €4.99.',
    objective: 'weekend_pass',
    cta: 'GET WEEKEND PASS — €4.99',
    landing_destination: '/?plan=weekend',
    channel: 'instagram',
  },
  {
    name: 'Try Premium — 40 Min Free',
    message: 'Try Premium features free for 40 minutes.',
    objective: 'premium',
    cta: 'TRY PREMIUM — 40 MIN FREE',
    landing_destination: '/studio',
    channel: 'facebook',
  },
  {
    name: 'AI Track of the Week',
    message: 'Submit your AI-assisted track. Win a Weekend Pass.',
    objective: 'community_engagement',
    cta: 'EXPLORE DJ FEATURES',
    landing_destination: '/',
    channel: 'community',
  },
];

export const getStatusMeta = (statusId) =>
  CAMPAIGN_STATUS.find(s => s.id === statusId) || CAMPAIGN_STATUS[0];

export const getChannelLabel = (channelId) =>
  CHANNELS.find(c => c.id === channelId)?.label || channelId;

export const getObjectiveLabel = (objId) =>
  OBJECTIVES.find(o => o.id === objId)?.label || objId;

export const formatCurrency = (amount, currency = 'EUR') => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export const formatPercent = (rate) => {
  if (rate === null || rate === undefined || isNaN(rate)) return 'N/A';
  return `${(rate * 100).toFixed(1)}%`;
};

export const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(n);
};