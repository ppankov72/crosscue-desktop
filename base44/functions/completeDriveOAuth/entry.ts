import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Google OAuth callback handler. Google redirects here after the user
// authorizes Drive access. Exchanges the auth code for access/refresh tokens
// and stores them in the DriveConnection entity keyed by trial_token (the
// OAuth 'state' parameter set by initiateDriveOAuth).
//
// This endpoint is hit by Google's redirect (GET with query params), NOT by
// the app's SDK. It returns a minimal HTML page that closes the popup.
//
// GOOGLE DRIVE IDENTITY != CROSSCUE IDENTITY — this never creates or modifies
// a CROSSCUE user account.

const REDIRECT_URI = 'https://enlightened-deck-smith-pro.base44.app/functions/completeDriveOAuth';

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const SUCCESS_HTML = `<!DOCTYPE html><html><head><title>Google Drive Connected</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1916;color:#e8dec5;text-align:center}
.ok{color:#d5ad58;font-size:48px;margin-bottom:16px}</style></head>
<body><div><div class="ok">✓</div><h2>Google Drive Connected</h2><p>You can close this window and return to CROSSCUE.</p>
<script>setTimeout(()=>window.close(),1500);</script></div></body></html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html><html><head><title>Connection Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1916;color:#ff2800;text-align:center}</style></head>
<body><div><h2>Connection Failed</h2><p>${msg}</p>
<script>setTimeout(()=>window.close(),3000);</script></div></body></html>`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      return htmlResponse(ERROR_HTML(`Authorization denied: ${errorParam}`));
    }

    if (!code || !state) {
      return htmlResponse(ERROR_HTML('Missing authorization data.'));
    }

    const clientId = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return htmlResponse(ERROR_HTML('Server not configured. Contact support.'));
    }

    // Exchange the authorization code for tokens.
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}));
      return htmlResponse(ERROR_HTML(errData.error_description || errData.error || 'Token exchange failed.'));
    }

    const tokens = await tokenResponse.json();

    // Fetch the connected Google account email for display purposes only.
    let connectedEmail = '';
    if (tokens.access_token) {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          connectedEmail = userInfo.email || '';
        }
      } catch {
        // Non-fatal — email is display-only.
      }
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    // Upsert the DriveConnection record keyed by trial_token.
    const existing = await base44.asServiceRole.entities.DriveConnection.filter({ trial_token: state });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.DriveConnection.update(existing[0].id, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existing[0].refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope || existing[0].scope,
        connected_email: connectedEmail,
      });
    } else {
      await base44.asServiceRole.entities.DriveConnection.create({
        trial_token: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expires_at: expiresAt,
        scope: tokens.scope || '',
        connected_email: connectedEmail,
      });
    }

    return htmlResponse(SUCCESS_HTML);
  } catch (error) {
    return htmlResponse(ERROR_HTML(error.message || 'Unexpected error.'));
  }
}