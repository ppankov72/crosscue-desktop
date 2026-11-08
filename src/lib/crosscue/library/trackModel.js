// Unified source-agnostic track descriptor model.
// Every library item conceptually supports these fields, but most are optional/nullable.
// Do NOT persist raw browser File objects into backend entities.

export const AVAILABILITY_STATES = {
  AVAILABLE: 'available',
  MISSING: 'missing',
  OFFLINE: 'offline',
  AUTH_REQUIRED: 'auth_required',
  PROVIDER_ERROR: 'provider_error',
  UNSUPPORTED: 'unsupported',
  RELINK_REQUIRED: 'relink_required',
};

export const SOURCE_TYPES = {
  LOCAL: 'local',
  YOUTUBE: 'youtube',
  GOOGLE_DRIVE: 'google_drive',
  DROPBOX: 'dropbox',
  ONEDRIVE: 'onedrive',
  SOUNDCLOUD: 'soundcloud',
  MIXCLOUD: 'mixcloud',
  CLOUD: 'cloud',
};

// Create a unified track descriptor from a source object.
export function createTrackDescriptor(source) {
  return {
    trackId: source.id || null,
    sourceType: source.type || SOURCE_TYPES.LOCAL,
    sourceId: source.sourceId || null,
    sourceUri: source.url || null,
    title: source.name || '',
    artist: source.artist || '',
    album: source.album || '',
    duration: source.duration || 0,
    fileName: source.file?.name || '',
    fileSize: source.file?.size || 0,
    mimeType: source.file?.type || '',
    analysis: {
      bpm: source.bpm || source.analysisBpm || 0,
      bpmConfidence: source.bpmConfidence || source.analysisBpmConfidence || 0,
      key: source.key || source.analysisKey || '',
      camelot: source.camelot || source.analysisKeyCamelot || '',
      waveformReference: null,
      analysisVersion: null,
    },
    djMetadata: {
      cuePoints: source.cuePoints || [],
      loops: source.loops || [],
      rating: source.rating || 0,
      favorite: source.favorite || false,
      notes: source.notes || '',
      playCount: source.playCount || 0,
      lastPlayedAt: source.lastPlayedAt || null,
    },
    localReference: {
      relativePath: source.relativePath || null,
      directoryId: source.directoryId || null,
      fingerprint: source.analysisFingerprint || null,
    },
    cloudReference: {
      provider: null,
      providerFileId: null,
      providerPath: null,
      accountConnectionId: null,
    },
    externalReference: {
      provider: source.type === 'youtube' ? 'youtube' : null,
      providerTrackId: source.trackId || null,
      canonicalUrl: source.url || null,
      streamCapability: source.type === 'youtube' ? 'iframe' : null,
    },
  };
}

// Normalize an existing track to include source/availability fields.
// This is the migration path for legacy local tracks — they become sourceType='local'.
export function normalizeTrack(track) {
  return {
    ...track,
    sourceType: track.sourceType || track.type || SOURCE_TYPES.LOCAL,
    availability: computeAvailability(track),
  };
}

// Compute availability state for a track.
export function computeAvailability(track) {
  if (track.type === 'youtube') return AVAILABILITY_STATES.AVAILABLE;
  if (track.sourceType === 'local' || track.type === 'local' || !track.type) {
    if (track.file instanceof Blob) return AVAILABILITY_STATES.AVAILABLE;
    if (track.fileRequired) return AVAILABILITY_STATES.MISSING;
    return AVAILABILITY_STATES.AVAILABLE;
  }
  // External providers — check connection state
  return AVAILABILITY_STATES.AUTH_REQUIRED;
}

// Get the strongest available track identifier for duplicate detection.
// Hierarchy: fingerprint > sourceId > filename+size+duration > filename+size > id
export function getTrackKey(track) {
  if (track.analysisFingerprint) return `fp:${track.analysisFingerprint}`;
  if (track.sourceId) return `sid:${track.sourceId}`;
  const fileName = track.fileName || track.file?.name || track.name;
  const fileSize = track.fileSize || track.file?.size || 0;
  if (fileSize && track.duration) return `fsd:${fileName}:${fileSize}:${track.duration}`;
  if (fileSize) return `fs:${fileName}:${fileSize}`;
  return `id:${track.id || fileName || ''}`;
}