// Duplicate detection using the strongest identifiers safely available.
// Hierarchy: fingerprint/hash > source/provider ID > filename+size+duration > filename+size.
// Path is a weak local hint only and never used alone for dedup.

import { getTrackKey } from './trackModel';

// Check if two tracks are duplicates.
export function isDuplicate(trackA, trackB) {
  const keyA = getTrackKey(trackA);
  const keyB = getTrackKey(trackB);

  // Strong key match (fingerprint or source ID)
  if (keyA === keyB && (keyA.startsWith('fp:') || keyA.startsWith('sid:'))) return true;

  // Filename + size match (strong signal for local files)
  const nameA = trackA.fileName || trackA.file?.name || trackA.name;
  const nameB = trackB.fileName || trackB.file?.name || trackB.name;
  const sizeA = trackA.fileSize || trackA.file?.size || 0;
  const sizeB = trackB.fileSize || trackB.file?.size || 0;

  if (nameA && nameB && nameA === nameB && sizeA > 0 && sizeA === sizeB) return true;

  // Legacy track ID match (for existing local tracks loaded from localStorage)
  const idA = trackA.id || trackA.trackId;
  const idB = trackB.id || trackB.trackId;
  if (idA && idB && idA === idB) return true;

  return false;
}

// Find duplicates between new tracks and existing tracks.
// Returns { duplicates: [...], unique: [...] }
export function findDuplicates(newTracks, existingTracks) {
  const duplicates = [];
  const unique = [];

  for (const newTrack of newTracks) {
    const isDup = existingTracks.some(existing => isDuplicate(newTrack, existing));
    if (isDup) {
      duplicates.push(newTrack);
    } else {
      unique.push(newTrack);
    }
  }

  return { duplicates, unique };
}

// Check if a single track is a duplicate of any existing track.
export function isDuplicateOfAny(track, existingTracks) {
  return existingTracks.some(existing => isDuplicate(track, existing));
}