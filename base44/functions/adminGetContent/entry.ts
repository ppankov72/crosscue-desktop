import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// P2 — Admin content management endpoint. Returns ALL docs + FAQ (including drafts).
// Admin-only: verifies user.role === 'admin' before returning data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [articles, faqs] = await Promise.all([
      base44.asServiceRole.entities.DocumentationArticle.list('sort_order', 1000),
      base44.asServiceRole.entities.FaqEntry.list('sort_order', 1000)
    ]);

    return Response.json({
      articles: articles.map(a => ({
        id: a.id, canonical_key: a.canonical_key, category: a.category,
        category_title: a.category_title, category_icon: a.category_icon,
        language: a.language, title: a.title, body: a.body,
        sort_order: a.sort_order || 0, status: a.status || 'draft',
        updated_date: a.updated_date
      })),
      faqs: faqs.map(f => ({
        id: f.id, canonical_key: f.canonical_key, language: f.language,
        category: f.category, question: f.question, answer: f.answer,
        sort_order: f.sort_order || 0, status: f.status || 'draft',
        updated_date: f.updated_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}