import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates or updates a DRAFT landing content record.
// Drafts and Published records are separate: saving a draft never touches a published record.
// Uniqueness for drafts: section + language + status=draft (no duplicate drafts).
// Admin-only: verifies user.role === 'admin'.
//
// To publish a draft, use adminPublishLandingContent (separate atomic action).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id, section, language, content } = body;

    if (!section || !language || content === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lang = language.slice(0, 2);
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // If id is provided, update that specific draft record
    if (id) {
      const updated = await base44.asServiceRole.entities.LandingContent.update(id, {
        section,
        language: lang,
        content: contentStr,
        status: 'draft',
        updated_by: user.id
      });
      return Response.json({ ok: true, id: updated.id });
    }

    // No id: find existing DRAFT for this section+language (never touch published)
    const existingDrafts = await base44.asServiceRole.entities.LandingContent.filter(
      { section, language: lang, status: 'draft' },
      '-created_date',
      1
    );
    if (existingDrafts.length > 0) {
      const updated = await base44.asServiceRole.entities.LandingContent.update(existingDrafts[0].id, {
        content: contentStr,
        updated_by: user.id
      });
      return Response.json({ ok: true, id: updated.id });
    }

    // Create new draft
    const created = await base44.asServiceRole.entities.LandingContent.create({
      section,
      language: lang,
      content: contentStr,
      status: 'draft',
      updated_by: user.id
    });
    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}