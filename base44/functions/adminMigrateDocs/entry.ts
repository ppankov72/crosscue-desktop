import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeHtml } from '../../shared/contentSanitizer.ts';

// P2 — Migration endpoint. Accepts static docs + FAQ content and creates entity records.
// Idempotent + non-destructive: records with matching canonical_key + language are skipped
// (preserving admin edits). Only missing records are created.
// Admin-only: verifies user.role === 'admin'.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { articles, faqs } = body;

    if (!Array.isArray(articles) || !Array.isArray(faqs)) {
      return Response.json({ error: 'Invalid payload: articles and faqs arrays required' }, { status: 400 });
    }

    let articlesCreated = 0, articlesUpdated = 0, articlesSkipped = 0;
    let faqsCreated = 0, faqsUpdated = 0, faqsSkipped = 0;

    // Process articles
    for (const a of articles) {
      const existing = await base44.asServiceRole.entities.DocumentationArticle.filter(
        { canonical_key: a.canonical_key, language: a.language },
        '-created_date', 1
      );
      if (existing.length > 0) {
        articlesSkipped++;
        continue;
      }
      await base44.asServiceRole.entities.DocumentationArticle.create({
        canonical_key: a.canonical_key,
        category: a.category,
        category_title: a.category_title || '',
        category_icon: a.category_icon || 'BookOpen',
        language: a.language,
        title: a.title,
        body: sanitizeHtml(a.body),
        sort_order: a.sort_order || 0,
        status: 'published',
        updated_by: user.id
      });
      articlesCreated++;
    }

    // Process FAQs
    for (const f of faqs) {
      const existing = await base44.asServiceRole.entities.FaqEntry.filter(
        { canonical_key: f.canonical_key, language: f.language },
        '-created_date', 1
      );
      if (existing.length > 0) {
        faqsSkipped++;
        continue;
      }
      await base44.asServiceRole.entities.FaqEntry.create({
        canonical_key: f.canonical_key,
        language: f.language,
        category: f.category || '',
        question: f.question,
        answer: sanitizeHtml(f.answer),
        sort_order: f.sort_order || 0,
        status: 'published',
        updated_by: user.id
      });
      faqsCreated++;
    }

    return Response.json({
      ok: true,
      articlesCreated, articlesUpdated, articlesSkipped,
      faqsCreated, faqsUpdated, faqsSkipped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}