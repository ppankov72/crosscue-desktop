import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Initiates a custom Google Drive OAuth flow for anonymous trial users.
// Returns a Google OAuth consent URL. The trial_token is passed as the OAuth
// 'state' parameter so the callback can associate the resulting tokens with
// the correct trial session — NOT with a CROSSCUE user account.
//
// GOOGLE DRIVE IDENTITY != CROSSCUE IDENTITY

const REDIRECT_URI = 'https://enlightened-deck-smith-pro.base44.app/functions/completeDriveOAuth';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { trial_token } = body;

    if (!trial_token) {
      return Response.json({ error: 'trial_token required' }, { status: 400 });
    }

    const clientId = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID');
    if (!clientId) {
      return Response.json({ error: 'Google Drive OAuth not configured. Set GOOGLE_DRIVE_CLIENT_ID secret.' }, { status: 500 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      state: trial_token,
      access_type: 'offline',
      prompt: 'consent',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}