import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin: manage CMS pages.
// Actions: list, get, save, publish, rollback, delete, reorder.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || 'list';
    const now = new Date().toISOString();

    if (action === 'list') {
      const pages = await base44.asServiceRole.entities.CmsPage.list('display_order', 200);
      return Response.json({ pages: pages.map(p => ({
        id: p.id, slug: p.slug, title: p.title, status: p.status,
        nav_visible: p.nav_visible, footer_visible: p.footer_visible,
        display_order: p.display_order, published_at: p.published_at,
        modified_at: p.modified_at, modified_by: p.modified_by,
        has_draft: Boolean(p.draft_content),
        has_published: Boolean(p.published_content),
        has_previous: Boolean(p.previous_published_content),
      }))});
    }

    if (action === 'get') {
      const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: body.slug });
      if (!pages.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const p = pages[0];
      return Response.json({
        page: {
          ...p,
          draft_content: p.draft_content ? JSON.parse(p.draft_content) : null,
          published_content: p.published_content ? JSON.parse(p.published_content) : null,
          previous_published_content: p.previous_published_content ? JSON.parse(p.previous_published_content) : null,
        }
      });
    }

    if (action === 'save') {
      const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: body.slug });
      const draftJson = JSON.stringify(body.draft_content || { sections: [] });
      const meta = body.page_meta || {};
      if (!pages.length) {
        const created = await base44.asServiceRole.entities.CmsPage.create({
          slug: body.slug,
          title: meta.title || body.slug,
          nav_label: meta.nav_label ? JSON.stringify(meta.nav_label) : '',
          seo_title: meta.seo_title ? JSON.stringify(meta.seo_title) : '',
          seo_description: meta.seo_description ? JSON.stringify(meta.seo_description) : '',
          og_title: meta.og_title || '',
          og_description: meta.og_description || '',
          og_image: meta.og_image || '',
          is_indexable: meta.is_indexable !== false,
          status: 'draft',
          nav_visible: meta.nav_visible || false,
          footer_visible: meta.footer_visible || false,
          display_order: meta.display_order || 0,
          draft_content: draftJson,
          published_content: '',
          previous_published_content: '',
          modified_at: now,
          modified_by: user.email,
        });
        return Response.json({ ok: true, id: created.id });
      }
      const p = pages[0];
      await base44.asServiceRole.entities.CmsPage.update(p.id, {
        draft_content: draftJson,
        title: meta.title || p.title,
        nav_label: meta.nav_label ? JSON.stringify(meta.nav_label) : p.nav_label,
        seo_title: meta.seo_title ? JSON.stringify(meta.seo_title) : p.seo_title,
        seo_description: meta.seo_description ? JSON.stringify(meta.seo_description) : p.seo_description,
        og_title: meta.og_title || p.og_title,
        og_description: meta.og_description || p.og_description,
        og_image: meta.og_image || p.og_image,
        is_indexable: meta.is_indexable !== undefined ? meta.is_indexable : p.is_indexable,
        nav_visible: meta.nav_visible !== undefined ? meta.nav_visible : p.nav_visible,
        footer_visible: meta.footer_visible !== undefined ? meta.footer_visible : p.footer_visible,
        display_order: meta.display_order !== undefined ? meta.display_order : p.display_order,
        modified_at: now,
        modified_by: user.email,
      });
      return Response.json({ ok: true });
    }

    if (action === 'publish') {
      const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: body.slug });
      if (!pages.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const p = pages[0];
      if (!p.draft_content) return Response.json({ error: 'No draft to publish' }, { status: 400 });
      const previousPublished = p.published_content || '';
      await base44.asServiceRole.entities.CmsPage.update(p.id, {
        published_content: p.draft_content,
        previous_published_content: previousPublished,
        status: 'published',
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      return Response.json({ ok: true });
    }

    if (action === 'rollback') {
      const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: body.slug });
      if (!pages.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const p = pages[0];
      if (!p.previous_published_content) return Response.json({ error: 'No previous version to restore' }, { status: 400 });
      const currentPublished = p.published_content || '';
      await base44.asServiceRole.entities.CmsPage.update(p.id, {
        published_content: p.previous_published_content,
        previous_published_content: currentPublished,
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      return Response.json({ ok: true });
    }

    if (action === 'delete') {
      const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: body.slug });
      if (!pages.length) return Response.json({ error: 'Not found' }, { status: 404 });
      await base44.asServiceRole.entities.CmsPage.delete(pages[0].id);
      return Response.json({ ok: true });
    }

    if (action === 'reorder') {
      const updates = body.updates || [];
      for (const u of updates) {
        const pages = await base44.asServiceRole.entities.CmsPage.filter({ slug: u.slug });
        if (pages.length) {
          await base44.asServiceRole.entities.CmsPage.update(pages[0].id, { display_order: u.display_order });
        }
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}