import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sanitizeText, sanitizeLongText, isBugCategory
} from '../../shared/feedbackSanitizer.ts';

// Phase G.1 — Submit a feature request (authenticated users only).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const title = sanitizeText(body.title || "", 200);
    const description = sanitizeLongText(body.description || "", 3000);
    const category = isBugCategory(body.category) ? body.category : 'other';

    if (title.length < 3) {
      return Response.json({ error: 'title_too_short' }, { status: 400 });
    }
    if (description.length < 10) {
      return Response.json({ error: 'description_too_short' }, { status: 400 });
    }

    const request = await base44.asServiceRole.entities.CrosscueFeatureRequest.create({
      author_user_id: user.id,
      author_email: user.email || '',
      title,
      description,
      category,
      status: 'submitted',
      vote_count: 0
    });

    return Response.json({
      ok: true,
      request_id: request.id,
      status: 'submitted'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}