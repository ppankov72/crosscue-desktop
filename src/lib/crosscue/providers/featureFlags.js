// Feature flags for external music source providers.
// Providers default to CONFIGURATION REQUIRED when credentials are absent.
// The backend function getMusicSourceConfig returns which providers are configured.
// If the backend function is unavailable, all providers remain CONFIGURATION REQUIRED.

import { base44 } from '@/api/base44Client';

export const PROVIDER_FEATURE_FLAGS = {
  google_drive: { enabled: false, label: 'Google Drive' },
  dropbox: { enabled: false, label: 'Dropbox' },
  onedrive: { enabled: false, label: 'OneDrive' },
  soundcloud: { enabled: false, label: 'SoundCloud' },
  mixcloud: { enabled: false, label: 'Mixcloud' },
};

let configCache = null;
let configFetchPromise = null;

// Fetch provider configuration status from backend.
// Returns a map of provider IDs to { configured, label }.
export async function fetchProviderConfig() {
  if (configCache) return configCache;
  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    try {
      const response = await base44.functions.invoke('getMusicSourceConfig', {});
      if (response?.providers) {
        configCache = response.providers;
        for (const [key, value] of Object.entries(response.providers)) {
          if (PROVIDER_FEATURE_FLAGS[key]) {
            PROVIDER_FEATURE_FLAGS[key].enabled = value.configured || false;
          }
        }
      }
      return configCache || PROVIDER_FEATURE_FLAGS;
    } catch {
      // Backend function not available — all providers remain CONFIGURATION REQUIRED
      configCache = PROVIDER_FEATURE_FLAGS;
      return configCache;
    } finally {
      configFetchPromise = null;
    }
  })();

  return configFetchPromise;
}

export function getProviderConfig(providerId) {
  if (configCache && configCache[providerId]) {
    return configCache[providerId];
  }
  return PROVIDER_FEATURE_FLAGS[providerId] || { enabled: false, label: providerId };
}

export function isProviderEnabled(providerId) {
  return getProviderConfig(providerId)?.enabled || false;
}

// Force re-fetch (e.g., after admin configures credentials)
export function clearConfigCache() {
  configCache = null;
}