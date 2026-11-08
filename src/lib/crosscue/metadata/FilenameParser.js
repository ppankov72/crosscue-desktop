/**
 * FilenameParser — fallback metadata inference from filename.
 *
 * ONLY used when embedded tags are absent. All inferred values are
 * marked with `inferred: true` so they are never confused with
 * embedded tag data.
 *
 * Pattern: "Artist - Title.ext" → { artist, title }
 * Fallback: "filename.ext" → { title: "filename" }
 */

const SEPARATORS = [' - ', ' – ', ' — ', ' — ', '- ', '–'];

export function parseFilename(filename) {
  // Remove extension
  const base = filename.replace(/\.[^/.]+$/, '');

  // Try "Artist - Title" pattern
  for (const sep of SEPARATORS) {
    const idx = base.indexOf(sep);
    if (idx > 0 && idx < base.length - sep.length) {
      const artist = base.slice(0, idx).trim();
      const title = base.slice(idx + sep.length).trim();
      if (artist && title) {
        return {
          tags: { artist, title },
          inferred: true,
          source: 'filename',
        };
      }
    }
  }

  // No separator found — use entire filename as title
  return {
    tags: { title: base.trim() },
    inferred: true,
    source: 'filename',
  };
}