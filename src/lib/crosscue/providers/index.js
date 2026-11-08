// Music source provider registry.
// Maps provider IDs to provider instances and provides lookup helpers.

import { LocalProvider } from './localProvider';
import { GoogleDriveProvider } from './googleDriveProvider';
import { DropboxProvider } from './dropboxProvider';
import { OneDriveProvider } from './oneDriveProvider';
import { SoundCloudProvider } from './soundcloudProvider';
import { MixcloudProvider } from './mixcloudProvider';
import { fetchProviderConfig } from './featureFlags';

const providers = {
  local: new LocalProvider(),
  google_drive: new GoogleDriveProvider(),
  dropbox: new DropboxProvider(),
  onedrive: new OneDriveProvider(),
  soundcloud: new SoundCloudProvider(),
  mixcloud: new MixcloudProvider(),
};

export function getProvider(id) {
  return providers[id] || null;
}

export function getAllProviders() {
  return Object.values(providers);
}

export function getProviderIds() {
  return Object.keys(providers);
}

// Get providers that are configured and could potentially connect.
export async function getAvailableProviders() {
  await fetchProviderConfig();
  return Object.values(providers).filter(p => p.isConfigured());
}

// Get connection state for all providers.
export async function getProviderStates() {
  await fetchProviderConfig();
  return Object.values(providers).map(p => ({
    id: p.id,
    label: p.label,
    capabilities: p.capabilities,
    state: p.getConnectionState(),
  }));
}

export { providers as musicSourceProviders };