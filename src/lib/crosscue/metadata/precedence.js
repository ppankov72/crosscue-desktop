/**
 * Metadata display precedence:
 *   Library override → Embedded tag → Track record fallback
 *
 * Library overrides: user edits stored in IndexedDB (libraryOverrides store).
 * Embedded tags: read from the original audio file (metadata store).
 * Track record: basic info cached in localStorage (crosscue-local-tracks).
 *
 * CRITICAL: This module is display-only. It never feeds values into
 * acoustic analysis (BPM detection, key detection, beat grid, etc.).
 */

const TRACK_FIELD_MAP = {
  title: 'name',
  artist: 'artist',
  album: 'album',
  genre: 'genre',
  bpm: 'bpm',
  key: 'key',
};

export function displayValue(field, overrides, embedded, track) {
  // 1. Library override
  if (overrides?.[field] != null && overrides[field] !== '') return overrides[field];
  // 2. Embedded tag
  if (embedded?.tags?.[field] != null && embedded.tags[field] !== '') return embedded.tags[field];
  // Special case: year can also be in tags.date
  if (field === 'year' && embedded?.tags?.date) return embedded.tags.date;
  // 3. Track record fallback
  const trackField = TRACK_FIELD_MAP[field] || field;
  if (track?.[trackField] != null && track[trackField] !== '') return track[trackField];
  return '';
}

export function hasOverride(field, overrides) {
  return overrides?.[field] != null && overrides[field] !== '';
}