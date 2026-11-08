import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isBugStatus, sanitizeLongText } from '../../shared/feedbackSanitizer.ts';

// Phase G.1 — Admin: update bug report status and add admin notes.
// Admin only — returns 403 for non-admins.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}

    const bugId = String(body.bug_id || '').trim();
    if (!bugId) return Response.json({ error: 'missing_bug_id' }, { status: 400 });

    const updates = {};
    if (isBugStatus(body.status)) updates.status = body.status;
    if (body.admin_notes !== undefined) {
      updates.admin_notes = sanitizeLongText(body.admin_notes, 5000);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 });
    }

    await base44.asServiceRole.entities.CrosscueBugReport.update(bugId, updates);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}