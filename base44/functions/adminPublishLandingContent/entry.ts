import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Admin-only: publishes a Draft landing content record.
// Flow:
// 1. Find the draft record by id (or by section+language+content if no id).
// 2. Archive any existing PUBLISHED record for the same section+language (set status='archived').
// 3. Create a NEW published record with the draft's content.
// 4. The draft record remains as a draft (admin can keep editing).
//
// This ensures:
// - Only ONE published record per section+language is active at any time.
// - The old published version is preserved as archived (history).
// - The public page never has a moment without content (old published exists until new is created).
// - Draft and Published are separate records that coexist.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id, section, language, content } = body;

    if (!section || !language) {
      return Response.json({ error: 'Missing section or language' }, { status: 400 });
    }
    const lang = language.slice(0, 2);

    // Resolve the content to publish
    let publishContent = content;

    if (id) {
      // Publish from an existing draft record
      const draft = await base44.asServiceRole.entities.LandingContent.get(id);
      if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });
      if (draft.section !== section || draft.language !== lang) {
        return Response.json({ error: 'Section/language mismatch' }, { status: 400 });
      }
      publishContent = draft.content;
    } else if (publishContent === undefined) {
      return Response.json({ error: 'Missing content or draft id' }, { status: 400 });
    }

    const contentStr = typeof publishContent === 'string' ? publishContent : JSON.stringify(publishContent);

    // 1. Archive existing published record(s) for this section+language
    const existingPublished = await base44.asServiceRole.entities.LandingContent.filter(
      { section, language: lang, status: 'published' },
      '-created_date',
      50
    );
    for (const pub of existingPublished) {
      await base44.asServiceRole.entities.LandingContent.update(pub.id, {
        status: 'archived',
        updated_by: user.id
      });
    }

    // 2. Create new published record
    const created = await base44.asServiceRole.entities.LandingContent.create({
      section,
      language: lang,
      content: contentStr,
      status: 'published',
      updated_by: user.id
    });

    return Response.json({ ok: true, id: created.id, archivedCount: existingPublished.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}