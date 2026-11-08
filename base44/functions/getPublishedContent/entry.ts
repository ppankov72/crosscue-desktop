import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// P2 — Public content endpoint. Returns published docs + FAQ for a language.
// Uses asServiceRole to bypass RLS (entity is admin-only) and filters by status=published.
// Drafts and archived content are never returned to public users.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const language = (body.language || 'en').slice(0, 2);

    const [articles, faqs] = await Promise.all([
      base44.asServiceRole.entities.DocumentationArticle.filter(
        { language, status: 'published' },
        'sort_order',
        500
      ),
      base44.asServiceRole.entities.FaqEntry.filter(
        { language, status: 'published' },
        'sort_order',
        500
      )
    ]);

    // Group articles by category
    const categories = [];
    const catMap = {};
    for (const a of articles) {
      if (!catMap[a.category]) {
        catMap[a.category] = {
          id: a.category,
          title: a.category_title || a.category,
          icon: a.category_icon || 'BookOpen',
          sections: []
        };
        categories.push(catMap[a.category]);
      }
      catMap[a.category].sections.push({
        id: a.id,
        canonical_key: a.canonical_key,
        title: a.title,
        body: a.body
      });
    }

    const faqEntries = faqs.map(f => ({
      id: f.id,
      canonical_key: f.canonical_key,
      category: f.category || '',
      question: f.question,
      answer: f.answer
    }));

    return Response.json({ categories, faq: faqEntries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}