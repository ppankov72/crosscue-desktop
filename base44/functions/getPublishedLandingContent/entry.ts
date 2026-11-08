import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint — returns all PUBLISHED landing content for a language.
// No auth required. Used by the public Landing Page.
// Returns a map: { [section]: parsedContentObject }
// Drafts and archived records are never returned.
// Invalid JSON or missing fields are silently skipped (fail-safe → static fallback).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const language = (body.language || 'en').slice(0, 2);

    const records = await base44.asServiceRole.entities.LandingContent.filter(
      { language, status: 'published' },
      '-created_date',
      100
    );

    const sections = {};
    for (const r of records) {
      if (!r.section) continue;
      try {
        const parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Last published wins (sorted by -created_date, so first seen is most recent)
          if (!sections[r.section]) {
            sections[r.section] = parsed;
          }
        }
      } catch {
        // Invalid JSON — skip this record, fall back to static for this section
      }
    }

    return Response.json({ ok: true, sections });
  } catch (error) {
    return Response.json({ ok: true, sections: {} });
  }
}