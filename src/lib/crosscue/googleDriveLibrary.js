// Helpers for managing Google Drive track references in the CrossCue library.
// Stores ONLY metadata — no file content, no OAuth tokens, no expiring URLs.
// The providerFileId is the permanent identity used for duplicate detection and relinking.

// Create a library track descriptor from a Google Drive file listing entry.
// driveFile shape matches what listGoogleDriveTracks returns:
//   { id, name, fileName, mimeType, size, modifiedTime, sourceType }
export function createDriveTrackDescriptor(driveFile) {
  const providerFileId = driveFile.id || driveFile.providerFileId;
  return {
    id: `gdrive-${providerFileId}`,
    type: 'google_drive',
    provider: 'google_drive',
    providerFileId,
    name: driveFile.name || driveFile.fileName || 'Unknown Drive Track',
    fileName: driveFile.fileName || driveFile.name || '',
    fileSize: driveFile.size || 0,
    mimeType: driveFile.mimeType || '',
    modifiedTime: driveFile.modifiedTime || null,
    supports: { mixer: true, waveform: true, pitch: true },
    fileRequired: false,
    analysisStatus: 'pending',
  };
}

// Check if a track is a Google Drive reference.
export function isDriveTrack(track) {
  return track?.type === 'google_drive' || track?.provider === 'google_drive';
}

// Find an existing library track by Google Drive providerFileId.
export function findDriveTrackInLibrary(providerFileId, tracks) {
  return tracks.find(
    t => t.providerFileId === providerFileId || t.id === `gdrive-${providerFileId}`
  );
}

// Check if a Google Drive file ID is already in the library.
export function isDriveTrackInLibrary(providerFileId, tracks) {
  return Boolean(findDriveTrackInLibrary(providerFileId, tracks));
}