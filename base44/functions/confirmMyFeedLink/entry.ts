import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getProfile, confirmLinking } from '../../shared/myFeedConnector.ts';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';

// Phase E — Verify/confirm MYFEED identity linking.
// Tries direct API confirmation first (bypasses broken browser dispatcher),
// then falls back to getProfile verification.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the pending link record for this user
    const pending = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'pending' }, '-created_date', 1);
    if (pending.length === 0) {
      return Response.json({ error: 'no_pending_link' }, { status: 404 });
    }

    const linkRecord = pending[0];

    // Check token expiry
    if (linkRecord.link_token_expires_at) {
      const expiresAt = new Date(linkRecord.link_token_expires_at).getTime();
      if (Date.now() > expiresAt) {
        await base44.asServiceRole.entities.MyFeedLink.update(linkRecord.id, {
          status: 'error', last_error: 'token_expired', last_status: 'expired'
        });
        return Response.json({ error: 'link_token_expired' }, { status: 410 });
      }
    }

    // Step 1: Try direct API confirmation (bypasses broken browser dispatcher)
    const linkRequestId = linkRecord.link_token || '';
    if (linkRequestId) {
      const confirmResult = await confirmLinking(linkRequestId, user.id);
      // If confirmation succeeds, proceed to get profile
      // If it fails, fall through to getProfile check (link may already be active)
    }

    // Step 2: Verify the link by calling getProfile
    const result = await getProfile(user.id);
    if (!result.ok) {
      // If IDENTITY_NOT_LINKED, the user hasn't confirmed yet on MYFEED side
      if (result.error === 'IDENTITY_NOT_LINKED' || result.status === 404) {
        return Response.json({
          error: 'not_confirmed_yet',
          message: 'Please confirm the link on MYFEED first.'
        }, { status: 425 }); // 425 Too Early
      }
      await base44.asServiceRole.entities.MyFeedLink.update(linkRecord.id, {
        status: 'error', last_error: result.error || 'verify_failed', last_status: 'error'
      });
      return Response.json({ error: result.error || 'myfeed_verify_failed' }, { status: 502 });
    }

    // Link is active — extract profile data from MYFEED response
    // MYFEED API returns { profile: { myfeed_profile_id, display_name, avatar_url, public_profile_url, ... } }
    const profile = result.data?.profile || {};
    const nowIso = new Date().toISOString();
    const profileUrl = profile.public_profile_url || '';
    const fullProfileUrl = profileUrl && !profileUrl.startsWith('http') ? `https://myfeed.docflowtools.de${profileUrl}` : profileUrl;

    // Update link record to 'linked'
    await base44.asServiceRole.entities.MyFeedLink.update(linkRecord.id, {
      status: 'linked',
      myfeed_user_id: profile.myfeed_profile_id || '',
      myfeed_display_name: profile.display_name || '',
      myfeed_avatar_url: profile.avatar_url || '',
      myfeed_profile_url: fullProfileUrl,
      linked_at: nowIso,
      last_sync_at: nowIso,
      last_status: 'linked',
      last_error: '',
      link_token: '' // clear the token — single-use, replay-protected
    });

    // Log security event
    await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.MYFEED_LINKED,
      `MYFEED linked: ${profile.display_name || 'Unknown'}`, req);

    return Response.json({
      ok: true,
      myfeed: {
        status: 'linked',
        myfeed_display_name: profile.display_name || '',
        myfeed_avatar_url: profile.avatar_url || '',
        myfeed_profile_url: fullProfileUrl,
        linked_at: nowIso
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}