// Shared Google Drive OAuth helpers — supports both authenticated CROSSCUE users
// (via the workspace APP_USER connector) AND anonymous trial users (via a custom
// OAuth flow with tokens stored in the DriveConnection entity keyed by trial_token).
//
// GOOGLE DRIVE IDENTITY != CROSSCUE IDENTITY
// A Google Drive connection is a storage-provider connection only. It never
// authenticates the user into CROSSCUE, never merges accounts, and never
// replaces the active TrialProfile or User identity.

const APP_USER_CONNECTOR_ID = '6a9f409efe7b680bb256241d';

export interface DriveTokenResult {
  accessToken: string;
  source: 'app_user' | 'trial';
}

/**
 * Resolves a valid Google Drive access token for the current request context.
 *
 * 1. If the caller is an authenticated CROSSCUE user with a connected APP_USER
 *    connector, that token is used (existing flow, unchanged).
 * 2. Otherwise, if a trial_token is provided, the DriveConnection entity is
 *    consulted. Expired tokens are refreshed automatically using the stored
 *    refresh_token.
 * 3. If neither path yields a token, { notConnected: true } is thrown.
 */
export async function getDriveAccessToken(base44: any, trialToken?: string): Promise<DriveTokenResult> {
  // --- Path 1: authenticated CROSSCUE user via APP_USER connector ---
  try {
    const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(APP_USER_CONNECTOR_ID);
    if (connection?.accessToken) {
      return { accessToken: connection.accessToken, source: 'app_user' };
    }
  } catch {
    // Not authenticated or connector not connected — fall through to trial path.
  }

  // --- Path 2: anonymous trial user via custom OAuth flow ---
  if (!trialToken) {
    throw { notConnected: true, message: 'Google Drive not connected' };
  }

  const existing = await base44.asServiceRole.entities.DriveConnection.filter({ trial_token: trialToken });
  if (!existing || existing.length === 0) {
    throw { notConnected: true, message: 'Google Drive not connected' };
  }

  const conn = existing[0];

  // Check if the access token is still valid (with a 60-second buffer).
  const expiresAtMs = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  if (Date.now() < expiresAtMs - 60000 && conn.access_token) {
    return { accessToken: conn.access_token, source: 'trial' };
  }

  // Token expired — refresh using the stored refresh_token.
  const clientId = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw { error: 'Google Drive OAuth not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET secrets.' };
  }

  if (!conn.refresh_token) {
    // No refresh token — connection is stale, clean it up.
    await base44.asServiceRole.entities.DriveConnection.delete(conn.id);
    throw { notConnected: true, message: 'Google Drive session expired. Please reconnect.' };
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: conn.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    // Refresh failed — the user needs to re-authorize.
    await base44.asServiceRole.entities.DriveConnection.delete(conn.id);
    throw { notConnected: true, message: 'Google Drive session expired. Please reconnect.' };
  }

  const tokens = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  await base44.asServiceRole.entities.DriveConnection.update(conn.id, {
    access_token: tokens.access_token,
    expires_at: newExpiresAt,
    // Google may not return a new refresh_token; keep the old one.
    refresh_token: tokens.refresh_token || conn.refresh_token,
  });

  return { accessToken: tokens.access_token, source: 'trial' };
}