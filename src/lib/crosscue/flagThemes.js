// National flag theme color definitions for the deck chassis.
// Hybrid approach: panels + accents get flag colors; VU meters, platter, and faders stay neutral.
// Each country defines 5 CSS custom properties consumed by the `flag-*` CSS theme.

export const flagThemeColors = {
  bg: { surface: '#1f1f1f', border: '#d62612', accent: '#00966e', text: '#f0f0f0', glow: 'rgba(0,150,110,.25)' },
  de: { surface: '#1a1a1a', border: '#dd0000', accent: '#ffce00', text: '#f0f0f0', glow: 'rgba(255,206,0,.25)' },
  it: { surface: '#1a1f1a', border: '#ce2b37', accent: '#009246', text: '#f0f0f0', glow: 'rgba(0,146,70,.25)' },
  es: { surface: '#1f1a14', border: '#aa151b', accent: '#f1bf00', text: '#f0f0f0', glow: 'rgba(241,191,0,.25)' },
  fr: { surface: '#0f1620', border: '#ef4135', accent: '#0055a4', text: '#f0f0f0', glow: 'rgba(0,85,164,.25)' },
  nl: { surface: '#161616', border: '#21468b', accent: '#ae1c28', text: '#f0f0f0', glow: 'rgba(174,28,40,.25)' },
  sr: { surface: '#16161f', border: '#c6363c', accent: '#0c4076', text: '#f0f0f0', glow: 'rgba(12,64,118,.25)' },
  ru: { surface: '#1a1a1f', border: '#d52b1e', accent: '#0039a6', text: '#f0f0f0', glow: 'rgba(0,57,166,.25)' },
  ro: { surface: '#16161a', border: '#ce1126', accent: '#fcd116', text: '#f0f0f0', glow: 'rgba(252,209,22,.25)' },
  tr: { surface: '#1f1414', border: '#e30a17', accent: '#ffffff', text: '#f0f0f0', glow: 'rgba(227,10,23,.3)' },
  el: { surface: '#0f1622', border: '#0d5eaf', accent: '#ffffff', text: '#f0f0f0', glow: 'rgba(13,94,175,.25)' },
  gb: { surface: '#0f1218', border: '#c8102e', accent: '#012169', text: '#f0f0f0', glow: 'rgba(1,33,105,.3)' },
};

// Build inline CSS custom properties (as a style object) for a flag theme.
export function flagThemeVars(countryCode) {
  const c = flagThemeColors[countryCode];
  if (!c) return {};
  return {
    '--flag-surface': c.surface,
    '--flag-border': c.border,
    '--flag-accent': c.accent,
    '--flag-text': c.text,
    '--flag-glow': c.glow,
  };
}

// Build inline CSS custom properties (as a style object) for custom chassis (deck panels only).
export function customChassisVars(customChassis) {
  if (!customChassis || customChassis.mode === 'none') return {};
  if (customChassis.mode === 'colors' && customChassis.colors?.length >= 2) {
    const [primary, secondary] = customChassis.colors;
    return {
      '--custom-chassis-bg': `linear-gradient(135deg,${primary} 0%,${secondary} 100%)`,
      '--custom-chassis-accent': secondary,
    };
  }
  if (customChassis.mode === 'image' && customChassis.imageUrl) {
    return { '--custom-chassis-image': `url('${customChassis.imageUrl}')` };
  }
  return {};
}