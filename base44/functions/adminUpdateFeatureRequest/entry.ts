import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isFeatureStatus, sanitizeLongText } from '../../shared/feedbackSanitizer.ts';

// Phase G.1 — Admin: update feature request status and add admin response.
// Admin only — returns 403 for non-admins.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}

    const featureId = String(body.feature_id || '').trim();
    if (!featureId) return Response.json({ error: 'missing_feature_id' }, { status: 400 });

    const updates = {};
    if (isFeatureStatus(body.status)) updates.status = body.status;
    if (body.admin_response !== undefined) {
      updates.admin_response = sanitizeLongText(body.admin_response, 5000);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 });
    }

    await base44.asServiceRole.entities.CrosscueFeatureRequest.update(featureId, updates);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}