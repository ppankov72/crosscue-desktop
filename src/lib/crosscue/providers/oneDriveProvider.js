import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';
import { getProviderConfig } from './featureFlags';

// OneDrive provider shell — CONFIGURATION REQUIRED until OAuth credentials are set.
// When configured, this would use Microsoft Graph API for DriveItem browsing.
// Required backend secrets: ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET
// OAuth scopes: Files.Read (least-privilege for reading user's files)
export class OneDriveProvider extends MusicSourceProvider {
  get id() { return 'onedrive'; }
  get label() { return 'OneDrive'; }

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
    return getProviderConfig('onedrive')?.enabled || false;
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION REQUIRED: OneDrive API credentials are not set up. An administrator must configure Microsoft Graph OAuth in the backend.');
    }
    throw new Error('OneDrive OAuth flow not yet implemented.');
  }

  async listFolders() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: OneDrive API credentials are not set up.');
    throw new Error('Not implemented — OneDrive folder browsing requires OAuth configuration.');
  }

  async listTracks() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: OneDrive API credentials are not set up.');
    throw new Error('Not implemented — OneDrive file listing requires OAuth configuration.');
  }

  async getPlayableSource() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED');
    throw new Error('Not implemented — OneDrive file download requires OAuth configuration.');
  }
}