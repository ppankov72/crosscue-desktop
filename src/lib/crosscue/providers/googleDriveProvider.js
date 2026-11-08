import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';
import { getProviderConfig } from './featureFlags';

// Google Drive provider shell — CONFIGURATION REQUIRED until OAuth credentials are set.
// When configured, this would use the Google Drive API v3 for folder browsing and file access.
// Required backend secrets: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET
// OAuth scopes: https://www.googleapis.com/auth/drive.readonly (least-privilege)
export class GoogleDriveProvider extends MusicSourceProvider {
  get id() { return 'google_drive'; }
  get label() { return 'Google Drive'; }

  get capabilities() {
    return {
      browseFolders: true,
      listTracks: true,
      search: false,
      stream: true,
      download: true,
      supportsOAuth: true,
    };
  }

  isConfigured() {
    return getProviderConfig('google_drive')?.enabled || false;
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION REQUIRED: Google Drive API credentials are not set up. An administrator must configure Google Drive OAuth in the backend.');
    }
    // When configured: redirect to Google OAuth consent screen
    throw new Error('Google Drive OAuth flow not yet implemented.');
  }

  async listFolders() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Google Drive API credentials are not set up.');
    throw new Error('Not implemented — Google Drive folder browsing requires OAuth configuration.');
  }

  async listTracks() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Google Drive API credentials are not set up.');
    throw new Error('Not implemented — Google Drive file listing requires OAuth configuration.');
  }

  async getPlayableSource() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED');
    throw new Error('Not implemented — Google Drive file download requires OAuth configuration.');
  }
}