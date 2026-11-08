import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dry-run migration preview. Returns a summary of what WOULD be imported vs
// what already exists, without making any changes to the database.
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

    let articlesToImport = 0, articlesExisting = 0;
    let faqsToImport = 0, faqsExisting = 0;
    const articlesExistingKeys = [];
    const faqsExistingKeys = [];

    // Check articles — no writes, just reads
    for (const a of articles) {
      const existing = await base44.asServiceRole.entities.DocumentationArticle.filter(
        { canonical_key: a.canonical_key, language: a.language },
        '-created_date', 1
      );
      if (existing.length > 0) {
        articlesExisting++;
        articlesExistingKeys.push(`${a.canonical_key} (${a.language})`);
      } else {
        articlesToImport++;
      }
    }

    // Check FAQs — no writes, just reads
    for (const f of faqs) {
      const existing = await base44.asServiceRole.entities.FaqEntry.filter(
        { canonical_key: f.canonical_key, language: f.language },
        '-created_date', 1
      );
      if (existing.length > 0) {
        faqsExisting++;
        faqsExistingKeys.push(`${f.canonical_key} (${f.language})`);
      } else {
        faqsToImport++;
      }
    }

    return Response.json({
      ok: true,
      articlesToImport, articlesExisting, articlesExistingKeys,
      faqsToImport, faqsExisting, faqsExistingKeys,
      totalArticles: articles.length,
      totalFaqs: faqs.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}