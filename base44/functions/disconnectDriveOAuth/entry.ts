import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Disconnects (revokes) a trial-user Google Drive connection.
// Deletes the DriveConnection record for the given trial_token.
// This does NOT affect CROSSCUE authentication or trial state.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { trial_token } = body;

    if (!trial_token) {
      return Response.json({ error: 'trial_token required' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.DriveConnection.filter({ trial_token });
    if (existing && existing.length > 0) {
      // Best-effort token revocation via Google (non-fatal if it fails).
      const conn = existing[0];
      if (conn.access_token) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        } catch {
          // Non-fatal — the local record is deleted regardless.
        }
      }
      await base44.asServiceRole.entities.DriveConnection.delete(conn.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}