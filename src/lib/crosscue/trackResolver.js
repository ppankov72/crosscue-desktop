import { base44 } from '@/api/base44Client';

// Single authoritative source-resolution path used by both manual A/B loading
// and AutoDJ. Local/YouTube tracks pass through unchanged; built-in Demo/Sample
// tracks with sourceUrl are fetched on-demand and cached in memory; Google Drive
// tracks are downloaded (via the getGoogleDriveFile backend function) and
// converted into a local File source before playback.

const remoteFileCache = new Map();

export const isPlayableTrack = track => Boolean(
  (track?.type === 'local' && (track.file instanceof Blob || track.sourceUrl)) ||
  (track?.type === 'youtube' && track.url) ||
  (track?.type === 'google_drive' && track.providerFileId)
);

export async function fetchRemoteTrackFile(track) {
  if (track?.file instanceof Blob) return track.file;
  const url = track?.sourceUrl;
  if (!url) return null;
  if (remoteFileCache.has(url)) return remoteFileCache.get(url);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load audio (${response.status})`);
  const blob = await response.blob();
  const isMp4 = /\.mp4(\?|$)/i.test(url);
  const isWav = /\.wav(\?|$)/i.test(url);
  const ext = isMp4 ? 'm4a' : isWav ? 'wav' : 'mp3';
  const mime = isMp4
    ? 'audio/mp4'
    : isWav
      ? 'audio/wav'
      : blob.type && blob.type.startsWith('audio/')
        ? blob.type
        : 'audio/mpeg';
  const file = new File([blob], `${track.name || 'track'}.${ext}`, { type: mime });
  remoteFileCache.set(url, file);
  return file;
}

export async function resolveTrackForPlayback(track) {
  if (!track) return null;
  if (track.type === 'google_drive') {
    const res = await base44.functions.invoke('getGoogleDriveFile', { fileId: track.providerFileId });
    const { base64Content, fileName, mimeType } = res.data;
    const byteChars = atob(base64Content);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });
    return { ...track, type: 'local', file, supports: track.supports || { mixer: true, waveform: true, pitch: true } };
  }
  if (track.type === 'local' && !(track.file instanceof Blob) && track.sourceUrl) {
    const file = await fetchRemoteTrackFile(track);
    return {
      ...track,
      type: 'local',
      file,
      fileRequired: false,
      supports: track.supports || { mixer: true, waveform: true, pitch: true }
    };
  }
  return track;
}