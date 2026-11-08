import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getProfile } from '../../shared/myFeedConnector.ts';

// Phase E — Read MYFEED profile (scope: profile:read).
// Only returns data for the authenticated user's own linked identity.
// Never exposes MYFEED internal user ID or linking tokens.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the active link for this user
    const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'linked' }, '-created_date', 1);
    if (links.length === 0) {
      return Response.json({ error: 'not_linked' }, { status: 404 });
    }

    const link = links[0];

    // Call MYFEED API to get profile
    const result = await getProfile(user.id);
    if (!result.ok) {
      return Response.json({ error: result.error || 'myfeed_profile_failed' }, { status: 502 });
    }

    // Update last sync time
    await base44.asServiceRole.entities.MyFeedLink.update(link.id, {
      last_sync_at: new Date().toISOString(),
      last_status: 'profile_read'
    });

    // MYFEED API returns { profile: { display_name, avatar_url, bio, public_profile_url, ... } }
    const profile = (result.data?.profile) || {};
    const profileUrl = profile.public_profile_url || '';
    const fullProfileUrl = profileUrl && !profileUrl.startsWith('http') ? `https://myfeed.docflowtools.de${profileUrl}` : profileUrl;
    return Response.json({
      profile: {
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        profile_url: fullProfileUrl
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}