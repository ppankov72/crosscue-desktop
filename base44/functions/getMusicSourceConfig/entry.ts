import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Returns configuration status for each external music source provider.
// Checks for the presence of OAuth credentials in app secrets.
// If a secret is not set, the provider is reported as "configured: false" (CONFIGURATION REQUIRED).
// This function never exposes secret values — only boolean configuration status.

function isSecretSet(name) {
  try {
    const value = secrets.get(name);
    return Boolean(value);
  } catch {
    return false;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const providers = {
      google_drive: {
        label: 'Google Drive',
        configured: isSecretSet('GOOGLE_DRIVE_CLIENT_ID') && isSecretSet('GOOGLE_DRIVE_CLIENT_SECRET'),
        requiredSecrets: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET'],
      },
      dropbox: {
        label: 'Dropbox',
        configured: isSecretSet('DROPBOX_APP_KEY') && isSecretSet('DROPBOX_APP_SECRET'),
        requiredSecrets: ['DROPBOX_APP_KEY', 'DROPBOX_APP_SECRET'],
      },
      onedrive: {
        label: 'OneDrive',
        configured: isSecretSet('ONEDRIVE_CLIENT_ID') && isSecretSet('ONEDRIVE_CLIENT_SECRET'),
        requiredSecrets: ['ONEDRIVE_CLIENT_ID', 'ONEDRIVE_CLIENT_SECRET'],
      },
      soundcloud: {
        label: 'SoundCloud',
        configured: isSecretSet('SOUNDCLOUD_CLIENT_ID') && isSecretSet('SOUNDCLOUD_CLIENT_SECRET'),
        requiredSecrets: ['SOUNDCLOUD_CLIENT_ID', 'SOUNDCLOUD_CLIENT_SECRET'],
      },
      mixcloud: {
        label: 'Mixcloud',
        configured: isSecretSet('MIXCLOUD_CLIENT_ID') && isSecretSet('MIXCLOUD_CLIENT_SECRET'),
        requiredSecrets: ['MIXCLOUD_CLIENT_ID', 'MIXCLOUD_CLIENT_SECRET'],
      },
    };

    return Response.json({ providers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}