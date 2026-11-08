/**
 * KeyNotation — centralized musical key notation helpers.
 *
 * Provides canonical note names, Camelot codes, and Open Key codes
 * derived from a single (rootIndex, mode) pair.
 *
 * Internal representation: 12 pitch classes (C=0, C#=1, ..., B=11)
 * Mode: 'major' or 'minor'
 *
 * These are derived representations — the canonical acoustic result
 * remains the musical key itself (root + mode).
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Camelot codes indexed by pitch class (C=0, C#=1, ..., B=11)
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

// Open Key codes indexed by pitch class
const OPENKEY_MAJOR = ['1d', '8d', '3d', '10d', '5d', '12d', '7d', '2d', '9d', '4d', '11d', '6d'];
const OPENKEY_MINOR = ['10m', '5m', '12m', '7m', '2m', '9m', '4m', '11m', '6m', '1m', '8m', '3m'];

export function noteName(rootIndex) {
  return NOTE_NAMES[((rootIndex % 12) + 12) % 12];
}

export function keyName(rootIndex, mode) {
  return `${noteName(rootIndex)} ${mode}`;
}

export function camelotCode(rootIndex, mode) {
  const idx = ((rootIndex % 12) + 12) % 12;
  return mode === 'minor' ? CAMELOT_MINOR[idx] : CAMELOT_MAJOR[idx];
}

export function openKeyCode(rootIndex, mode) {
  const idx = ((rootIndex % 12) + 12) % 12;
  return mode === 'minor' ? OPENKEY_MINOR[idx] : OPENKEY_MAJOR[idx];
}