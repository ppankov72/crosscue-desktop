import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getDriveAccessToken } from '../../shared/driveOAuth.ts';

// Downloads a single audio file from Google Drive and returns it as base64.
// Supports both authenticated CROSSCUE users (APP_USER connector) and
// anonymous trial users (custom OAuth via trial_token).
//
// GOOGLE DRIVE IDENTITY != CROSSCUE IDENTITY

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB cap

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, end)));
  }
  return btoa(binary);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { fileId, trial_token } = body;
    if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400 });

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

    // Get file metadata first (name, mimeType, size)
    const metaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaResponse.ok) {
      const errorData = await metaResponse.json().catch(() => ({}));
      return Response.json(
        { error: errorData.error?.message || 'Drive API error' },
        { status: metaResponse.status }
      );
    }
    const meta = await metaResponse.json();

    // Check file size before downloading
    const fileSize = parseInt(meta.size || '0', 10);
    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB. Use local import for larger files.` },
        { status: 413 }
      );
    }

    // Download file content
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!downloadResponse.ok) {
      return Response.json({ error: 'Download failed' }, { status: downloadResponse.status });
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const base64Content = arrayBufferToBase64(arrayBuffer);

    return Response.json({
      fileName: meta.name,
      mimeType: meta.mimeType,
      size: fileSize,
      base64Content,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}