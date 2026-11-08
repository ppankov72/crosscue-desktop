import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const isTauriDesktop =
  typeof window !== 'undefined' &&
  Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

export const base44 = createClient({
  appId: appId || 'crosscue-desktop',
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
  analytics: {
    enabled: !isTauriDesktop && Boolean(appId)
  }
});