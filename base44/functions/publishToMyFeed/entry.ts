import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  publishActivity, isAllowedActivityType,
  sanitizeActivityContent, generateIdempotencyKey
} from '../../shared/myFeedConnector.ts';

// Phase E — Publish activity to MYFEED (scope: activity:write).
// Manual user action only — nothing is posted automatically.
// Idempotency key prevents duplicate activities on double-click.
// Content is sanitized — no HTML, no scripts, no local filenames.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const activityType = body.activity_type || '';
    const content = body.content || '';
    const url = body.url || '';
    const idempotencyKey = body.idempotency_key || generateIdempotencyKey(user.id, activityType);

    // Validate activity type against whitelist
    if (!isAllowedActivityType(activityType)) {
      return Response.json({ error: 'invalid_activity_type' }, { status: 400 });
    }

    // Sanitize content
    const sanitized = sanitizeActivityContent(content);
    if (!sanitized) {
      return Response.json({ error: 'empty_content' }, { status: 400 });
    }

    // Check MYFEED link is active
    const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: user.id, status: 'linked' }, '-created_date', 1);
    if (links.length === 0) {
      return Response.json({ error: 'not_linked' }, { status: 403 });
    }

    const link = links[0];

    // Check share_activity_enabled setting
    if (!link.share_activity_enabled) {
      return Response.json({ error: 'activity_sharing_disabled' }, { status: 403 });
    }

    // Call MYFEED API to publish activity — connector uses "text" field per MYFEED API v1 docs
    const result = await publishActivity(user.id, activityType, sanitized, idempotencyKey, url || undefined);
    if (!result.ok) {
      return Response.json({ error: result.error || 'myfeed_publish_failed' }, { status: 502 });
    }

    return Response.json({
      ok: true,
      activity_id: result.data.activity_id || '',
      created_at: result.data.created_at || new Date().toISOString(),
      idempotency_key: idempotencyKey
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}