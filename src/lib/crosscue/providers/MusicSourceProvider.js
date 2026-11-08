// Base class for music source providers.
// Each provider declares capabilities and implements available methods.
// Providers that require OAuth/API credentials default to CONFIGURATION REQUIRED.

export const PROVIDER_STATUS = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'not_connected',
  CONFIGURATION_REQUIRED: 'configuration_required',
  ERROR: 'error',
  NOT_IMPLEMENTED: 'not_implemented',
};

export class MusicSourceProvider {
  constructor(config = {}) {
    this.config = config;
    this._connectionState = 'disconnected';
  }

  // Provider identity — override in subclasses
  get id() { throw new Error('Provider must implement id getter'); }
  get label() { throw new Error('Provider must implement label getter'); }

  // Capability declaration — providers override these to declare what they support
  get capabilities() {
    return {
      browseFolders: false,
      listTracks: false,
      search: false,
      stream: false,
      download: false,
      supportsOAuth: false,
    };
  }

  // Configuration status — true if API credentials are set up on the backend.
  // Override in subclasses to check specific credentials.
  isConfigured() { return false; }

  // Connection state
  isConnected() { return this._connectionState === 'connected'; }

  getConnectionState() {
    if (!this.isConfigured()) return PROVIDER_STATUS.CONFIGURATION_REQUIRED;
    if (this._connectionState === 'error') return PROVIDER_STATUS.ERROR;
    return this.isConnected() ? PROVIDER_STATUS.CONNECTED : PROVIDER_STATUS.NOT_CONNECTED;
  }

  // OAuth / connection methods — override in subclasses
  async connect() {
    if (!this.isConfigured()) {
      throw new Error(`CONFIGURATION REQUIRED: ${this.label} API credentials are not set up.`);
    }
    throw new Error(`${this.label}: connect() not implemented`);
  }

  async disconnect() {
    this._connectionState = 'disconnected';
  }

  // Browsing methods — override in subclasses
  async listFolders(parentId = null) { return []; }
  async listTracks(folderId = null) { return []; }
  async search(query) { return []; }

  // Track methods — override in subclasses
  async getTrackMetadata(trackId) { return null; }
  async getPlayableSource(trackId) { return null; }

  // Capability check helpers
  canStream() { return this.capabilities.stream && this.isConnected(); }
  canDownload() { return this.capabilities.download && this.isConnected(); }
  canBrowseFolders() { return this.capabilities.browseFolders && this.isConnected(); }
  canSearch() { return this.capabilities.search && this.isConnected(); }
}