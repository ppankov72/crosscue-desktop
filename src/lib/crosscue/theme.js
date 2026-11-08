import { useEffect, useState } from 'react';

const KEY = 'crosscue-theme';
const legacyKey = 'decksmith-theme';
const themes = new Set(['crosscue', 'decksmith', 'denim']);

export function useCrossCueTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(KEY) || localStorage.getItem(legacyKey) || 'crosscue';
    return themes.has(saved) ? saved : 'crosscue';
  });

  useEffect(() => {
    localStorage.setItem(KEY, theme);
    document.documentElement.dataset.crosscueTheme = theme;
  }, [theme]);

  return [theme, setTheme];
}

export const themeNames = { crosscue: 'CROSSCUE', decksmith: 'DECKSMITH', denim: 'DENIM' };