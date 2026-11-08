// CROSSCUE cloud playlist metadata sync.
// Synchronizes playlist and DJ metadata across devices — NOT local music files.
// Uses Base44 backend entities (CloudPlaylist) for persistence.
// Works offline: local playlists/tracks remain functional without internet.

import { base44 } from '@/api/base44Client';

const DEVICE_ID_KEY = 'crosscue-device-id';
const PENDING_SYNC_KEY = 'crosscue-sync-pending';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Build a serializable track descriptor for cloud sync.
// Strips non-persistable fields (File objects, Blob URLs, device-specific paths).
function buildTrackDescriptor(track) {
  return {
    id: track.id,
    sourceType: track.sourceType || track.type || 'local',
    title: track.name,
    artist: track.artist || '',
    album: track.album || '',
    duration: track.duration || 0,
    fileName: track.fileName || track.file?.name || '',
    fileSize: track.fileSize || track.file?.size || 0,
    analysisFingerprint: track.analysisFingerprint || null,
    analysisBpm: track.analysisBpm || 0,
    analysisKey: track.analysisKey || '',
    analysisKeyCamelot: track.analysisKeyCamelot || '',
    relativePath: track.relativePath || null,
    djMetadata: {
      cuePoints: track.cuePoints || [],
      loops: track.loops || [],
      rating: track.rating || 0,
      favorite: track.favorite || false,
      notes: track.notes || '',
    },
  };
}

// Push local playlists to cloud.
export async function syncPush(playlists, tracks) {
  if (!navigator.onLine) {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ timestamp: Date.now() }));
    return { status: 'offline', pending: true };
  }

  const deviceId = getDeviceId();
  const now = new Date().toISOString();

  const trackMap = new Map(tracks.map(t => [t.id, t]));
  const descriptors = playlists.map(p => ({
    sync_id: p.syncId || p.id,
    name: p.name,
    track_descriptors: JSON.stringify(
      (p.trackIds || []).map(id => {
        const track = trackMap.get(id);
        return track ? buildTrackDescriptor(track) : { id };
      })
    ),
    sort_order: p.sortOrder || 0,
    updated_by_device: deviceId,
    updated_at: now,
  }));

  try {
    const response = await base44.functions.invoke('syncPlaylists', {
      action: 'push',
      playlists: descriptors,
    });
    localStorage.removeItem(PENDING_SYNC_KEY);
    return { status: 'synced', ...response };
  } catch (error) {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ timestamp: Date.now(), error: error.message }));
    return { status: 'error', error: error.message };
  }
}

// Pull cloud playlists to local.
export async function syncPull() {
  if (!navigator.onLine) {
    return { status: 'offline', playlists: [] };
  }

  try {
    const response = await base44.functions.invoke('syncPlaylists', { action: 'pull' });
    return { status: 'synced', ...response };
  } catch (error) {
    return { status: 'error', error: error.message, playlists: [] };
  }
}

// Get current sync status.
export function getSyncStatus() {
  if (!navigator.onLine) return 'offline';
  const pending = localStorage.getItem(PENDING_SYNC_KEY);
  if (pending) return 'pending';
  return 'synced';
}

// Check if there are pending changes to sync.
export function hasPendingSync() {
  return Boolean(localStorage.getItem(PENDING_SYNC_KEY));
}

// Clear pending sync state after successful sync.
export function clearPendingSync() {
  localStorage.removeItem(PENDING_SYNC_KEY);
}

export { getDeviceId };