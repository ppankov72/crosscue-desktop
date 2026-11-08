import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';
import { getProviderConfig } from './featureFlags';

// SoundCloud provider shell — CONFIGURATION REQUIRED until OAuth credentials are set.
// Uses modern OAuth with PKCE (no client secret in browser code).
// Required backend secrets: SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_CLIENT_SECRET
// API: https://developers.soundcloud.com/docs/api/guide
export class SoundCloudProvider extends MusicSourceProvider {
  get id() { return 'soundcloud'; }
  get label() { return 'SoundCloud'; }

  get capabilities() {
    return {
      browseFolders: false,
      listTracks: true, // user's tracks/likes
      search: true,
      stream: true, // API-dependent — requires authorized stream URL
      download: false, // SoundCloud API does not generally permit downloads
      supportsOAuth: true,
    };
  }

  isConfigured() {
    return getProviderConfig('soundcloud')?.enabled || false;
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION REQUIRED: SoundCloud API credentials are not set up. An administrator must configure SoundCloud OAuth (PKCE) in the backend.');
    }
    throw new Error('SoundCloud OAuth flow not yet implemented.');
  }

  async search() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: SoundCloud API credentials are not set up.');
    throw new Error('Not implemented — SoundCloud search requires OAuth configuration.');
  }

  async listTracks() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: SoundCloud API credentials are not set up.');
    throw new Error('Not implemented — SoundCloud track listing requires OAuth configuration.');
  }

  async getPlayableSource() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED');
    throw new Error('Not implemented — SoundCloud stream requires OAuth configuration.');
  }
}