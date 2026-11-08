// Relink logic for matching missing local tracks to files in a new folder.
// Used when a playlist syncs from another device and local file paths differ.
//
// Matching hierarchy:
// 1. Filename match (strongest signal for relink — path may differ but name is same)
// 2. File size match (confirms same file)
// 3. Duration match (if metadata available — confirms same audio content)
// 4. Relative path match (weak hint only)
//
// Ambiguous matches (two candidates within 10 points) are NOT silently accepted.

// Match a missing track to available files from a new folder selection.
export function matchTrack(track, availableFiles) {
  const candidates = [];

  for (const file of availableFiles) {
    let score = 0;
    const reasons = [];

    // Filename match (strongest signal)
    const trackFileName = track.fileName || track.name;
    if (trackFileName && file.name === trackFileName) {
      score += 50;
      reasons.push('filename');
    }

    // File size match
    const trackSize = track.fileSize || 0;
    if (trackSize > 0 && file.size === trackSize) {
      score += 30;
      reasons.push('size');
    }

    // Duration match (if metadata available)
    if (track.duration && file.duration && Math.abs(track.duration - file.duration) < 0.5) {
      score += 20;
      reasons.push('duration');
    }

    // Relative path match (weak hint)
    if (track.relativePath && file.relativePath && track.relativePath === file.relativePath) {
      score += 10;
      reasons.push('path');
    }

    if (score > 0) {
      candidates.push({ file, score, reasons });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { status: 'unmatched' };
  }

  // Check for ambiguity (top two candidates within 10 points)
  if (candidates.length > 1 && candidates[0].score - candidates[1].score < 10) {
    return { status: 'ambiguous', candidates: candidates.slice(0, 3) };
  }

  // Require minimum confidence
  if (candidates[0].score < 30) {
    return { status: 'unmatched' };
  }

  return {
    status: 'matched',
    file: candidates[0].file,
    score: candidates[0].score,
    reasons: candidates[0].reasons,
  };
}

// Relink missing tracks using files from a new folder selection.
// Returns { matched: [...], unmatched: [...], ambiguous: [...] }
export function relinkFolder(missingTracks, newFiles) {
  const results = {
    matched: [],
    unmatched: [],
    ambiguous: [],
  };

  for (const track of missingTracks) {
    const result = matchTrack(track, newFiles);
    if (result.status === 'matched') {
      results.matched.push({
        track,
        file: result.file,
        score: result.score,
        reasons: result.reasons,
      });
    } else if (result.status === 'ambiguous') {
      results.ambiguous.push({ track, candidates: result.candidates });
    } else {
      results.unmatched.push(track);
    }
  }

  return results;
}