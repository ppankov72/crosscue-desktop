import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDriveAccessToken } from '../../shared/driveOAuth.ts';

// Lists audio files from Google Drive.
// Supports two connection paths:
//   1. Authenticated CROSSCUE users — via the APP_USER workspace connector.
//   2. Anonymous trial users — via a custom OAuth flow (DriveConnection entity
//      keyed by trial_token). The trial_token is passed in the request body.
//
// GOOGLE DRIVE IDENTITY != CROSSCUE IDENTITY

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { pageToken, pageSize, trial_token } = body;

    let accessToken: string;
    try {
      const result = await getDriveAccessToken(base44, trial_token);
      accessToken = result.accessToken;
    } catch (err: any) {
      if (err?.notConnected) {
        return Response.json({ error: 'Google Drive not connected', notConnected: true }, { status: 401 });
      }
      return Response.json({ error: err?.message || 'Failed to get Drive token' }, { status: 401 });
    }

    const params = new URLSearchParams({
      q: "mimeType contains 'audio' and trashed=false",
      fields: 'files(id,name,mimeType,size,modifiedTime,parents),nextPageToken',
      pageSize: String(pageSize || 100),
      orderBy: 'modifiedTime desc',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.error?.message || 'Google Drive API error', code: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      tracks: (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name.replace(/\.[^/.]+$/, ''),
        fileName: f.name,
        mimeType: f.mimeType,
        size: parseInt(f.size || '0', 10),
        modifiedTime: f.modifiedTime,
        sourceType: 'google_drive',
      })),
      nextPageToken: data.nextPageToken || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}