import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public: fetch a published CMS page by slug.
// Returns only the published_content (never draft). Falls back to { found: false }.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const slug = body.slug || '/';

    const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug });
    if (!pages.length) return Response.json({ found: false });
    const page = pages[0];
    if (!page.published_content) return Response.json({ found: false });

    let content;
    try { content = JSON.parse(page.published_content); } catch { return Response.json({ found: false }); }

    return Response.json({
      found: true,
      page: {
        slug: page.slug,
        title: page.title,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        og_title: page.og_title,
        og_description: page.og_description,
        og_image: page.og_image,
        is_indexable: page.is_indexable !== false,
        content,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}