import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';
import { getProviderConfig } from './featureFlags';

// Dropbox provider shell — CONFIGURATION REQUIRED until OAuth credentials are set.
// When configured, this would use the Dropbox API v2 for folder browsing and file access.
// Required backend secrets: DROPBOX_APP_KEY, DROPBOX_APP_SECRET
export class DropboxProvider extends MusicSourceProvider {
  get id() { return 'dropbox'; }
  get label() { return 'Dropbox'; }

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
    return getProviderConfig('dropbox')?.enabled || false;
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION REQUIRED: Dropbox API credentials are not set up. An administrator must configure Dropbox OAuth in the backend.');
    }
    throw new Error('Dropbox OAuth flow not yet implemented.');
  }

  async listFolders() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Dropbox API credentials are not set up.');
    throw new Error('Not implemented — Dropbox folder browsing requires OAuth configuration.');
  }

  async listTracks() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Dropbox API credentials are not set up.');
    throw new Error('Not implemented — Dropbox file listing requires OAuth configuration.');
  }

  async getPlayableSource() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED');
    throw new Error('Not implemented — Dropbox file download requires OAuth configuration.');
  }
}