import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeHtml } from '../../shared/contentSanitizer.ts';

// P2 — Admin save FAQ endpoint. Creates or updates a FaqEntry.
// Sanitizes HTML answer server-side to prevent stored XSS.
// Admin-only: verifies user.role === 'admin'.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id, canonical_key, language, category, question, answer, sort_order, status } = body;

    if (!canonical_key || !language || !question || answer === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sanitizedAnswer = sanitizeHtml(answer);

    if (id) {
      const updated = await base44.asServiceRole.entities.FaqEntry.update(id, {
        canonical_key, language, category: category || '',
        question, answer: sanitizedAnswer,
        sort_order: sort_order || 0,
        status: status || 'draft',
        updated_by: user.id
      });
      return Response.json({ ok: true, id: updated.id });
    } else {
      // Prevent duplicates: check for existing record with same canonical_key + language
      const existing = await base44.asServiceRole.entities.FaqEntry.filter(
        { canonical_key, language }, '-created_date', 1
      );
      const payload = {
        canonical_key, language, category: category || '',
        question, answer: sanitizedAnswer,
        sort_order: sort_order || 0,
        status: status || 'draft',
        updated_by: user.id
      };
      if (existing.length > 0) {
        const updated = await base44.asServiceRole.entities.FaqEntry.update(existing[0].id, payload);
        return Response.json({ ok: true, id: updated.id });
      }
      const created = await base44.asServiceRole.entities.FaqEntry.create(payload);
      return Response.json({ ok: true, id: created.id });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}