import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';
import { getProviderConfig } from './featureFlags';

// Mixcloud provider shell — CONFIGURATION REQUIRED until OAuth credentials are set.
// Mixcloud represents DJ sets, radio shows, and long-form mixes (Cloudcasts).
// Direct deck playback may not be supported by the official API.
// Capabilities focus on browsing, search, metadata, and canonical URL references.
// Required backend secrets: MIXCLOUD_CLIENT_ID, MIXCLOUD_CLIENT_SECRET
export class MixcloudProvider extends MusicSourceProvider {
  get id() { return 'mixcloud'; }
  get label() { return 'Mixcloud'; }

  get capabilities() {
    return {
      browseFolders: false,
      listTracks: true, // mixes/shows
      search: true,
      stream: false, // direct deck playback not reliably supported
      download: false,
      supportsOAuth: true,
    };
  }

  isConfigured() {
    return getProviderConfig('mixcloud')?.enabled || false;
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('CONFIGURATION REQUIRED: Mixcloud API credentials are not set up. An administrator must configure Mixcloud OAuth in the backend.');
    }
    throw new Error('Mixcloud OAuth flow not yet implemented.');
  }

  async search() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Mixcloud API credentials are not set up.');
    throw new Error('Not implemented — Mixcloud search requires OAuth configuration.');
  }

  async listTracks() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED: Mixcloud API credentials are not set up.');
    throw new Error('Not implemented — Mixcloud listing requires OAuth configuration.');
  }

  // Mixcloud items can be opened in the browser as canonical URLs.
  // Adding as bookmarks/references to playlists is supported when configured.
  async getPlayableSource() {
    if (!this.isConfigured()) throw new Error('CONFIGURATION REQUIRED');
    // Direct deck playback is not supported by the official Mixcloud API.
    return null;
  }
}