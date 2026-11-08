import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { initiateLinking } from '../../shared/myFeedConnector.ts';

// Phase E — Initiate MYFEED identity linking.
// Calls apiV1InitiateLinking → gets link_request_id, confirm_url, expires_in.
// User must consent on MYFEED side (confirm_url) before link is active.
// Does NOT auto-link by email — requires explicit consent flow.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check for existing active link
    const existing = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'linked' }, '-created_date', 1);
    if (existing.length > 0) {
      return Response.json({ error: 'already_linked' }, { status: 409 });
    }

    // Get display name from DJ Profile
    let displayName = user.full_name || user.email || '';
    try {
      const profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: user.id }, '-created_date', 1);
      if (profiles.length > 0 && profiles[0].display_name) {
        displayName = profiles[0].display_name;
      }
    } catch {}

    // Call MYFEED API to initiate linking
    const result = await initiateLinking(user.id, displayName);
    if (!result.ok) {
      return Response.json({ error: result.error || 'myfeed_initiate_failed' }, { status: 502 });
    }

    // Per MYFEED API v1 docs: response has link_request_id, confirm_url, expires_in
    const linkRequestId = result.data?.link_request_id || '';
    const confirmUrl = result.data?.confirm_url || '';
    const expiresIn = result.data?.expires_in || 900;

    if (!linkRequestId || !confirmUrl) {
      return Response.json({ error: 'myfeed_initiate_invalid_response' }, { status: 502 });
    }

    // Calculate expiry timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Create/update pending link record — store link_request_id in link_token field
    const pending = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'pending' }, '-created_date', 1);
    const nowIso = new Date().toISOString();
    if (pending.length > 0) {
      await base44.asServiceRole.entities.MyFeedLink.update(pending[0].id, {
        link_token: linkRequestId, // reuse field to store link_request_id
        link_token_expires_at: expiresAt,
        last_status: 'initiated', last_sync_at: nowIso
      });
    } else {
      await base44.asServiceRole.entities.MyFeedLink.create({
        user_id: user.id, user_email: user.email || '',
        status: 'pending',
        link_token: linkRequestId, // reuse field to store link_request_id
        link_token_expires_at: expiresAt,
        last_status: 'initiated', last_sync_at: nowIso,
        share_activity_enabled: false
      });
    }

    return Response.json({
      ok: true,
      link_request_id: linkRequestId,
      confirm_url: confirmUrl,
      expires_at: expiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}