import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns all managed landing content for a given language, grouped by section.
// Each section shows its draft (if any) and published (if any) separately.
// Admin-only: verifies user.role === 'admin'.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const language = (body.language || 'en').slice(0, 2);

    const records = await base44.asServiceRole.entities.LandingContent.filter(
      { language },
      '-created_date',
      200
    );

    // Group by section: pick the most recent draft and most recent published per section
    const bySection = {};
    for (const r of records) {
      if (!r.section) continue;
      if (!bySection[r.section]) bySection[r.section] = { draft: null, published: null, archivedCount: 0 };
      const entry = bySection[r.section];
      if (r.status === 'draft' && !entry.draft) {
        entry.draft = r;
      } else if (r.status === 'published' && !entry.published) {
        entry.published = r;
      } else if (r.status === 'archived') {
        entry.archivedCount++;
      }
    }

    return Response.json({ ok: true, sections: bySection });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}