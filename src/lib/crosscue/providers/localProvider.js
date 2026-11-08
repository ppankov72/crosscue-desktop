import { MusicSourceProvider, PROVIDER_STATUS } from './MusicSourceProvider';

// Local file provider — always available, no OAuth required.
export class LocalProvider extends MusicSourceProvider {
  get id() { return 'local'; }
  get label() { return 'Local Files'; }

  get capabilities() {
    return {
      browseFolders: true,
      listTracks: true,
      search: false,
      stream: true,
      download: true,
      supportsOAuth: false,
    };
  }

  isConfigured() { return true; }
  isConnected() { return true; }
  getConnectionState() { return PROVIDER_STATUS.CONNECTED; }

  async connect() { return true; }
  async disconnect() { /* no-op — local is always available */ }
}