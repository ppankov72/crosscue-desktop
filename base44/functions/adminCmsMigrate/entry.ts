import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin: migrate existing content into CMS records.
// Receives default content from the frontend (built from translations.js).
// Also merges any existing published LandingContent records.
// Idempotent: only creates records that don't already exist.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const defaults = body.defaults;
    if (!defaults) return Response.json({ error: 'defaults required' }, { status: 400 });

    const now = new Date().toISOString();
    const result = { pagesCreated: 0, pagesSkipped: 0, settingsCreated: 0, settingsSkipped: 0, landingMerged: 0 };

    // Merge existing published LandingContent into the home page sections
    const homePage = defaults.pages.find(p => p.slug === '/');
    if (homePage) {
      try {
        const existingLanding = await base44.asServiceRole.entities.LandingContent.filter({ status: 'published' });
        for (const lc of existingLanding) {
          if (!lc.content) continue;
          let managedContent;
          try { managedContent = JSON.parse(lc.content); } catch { continue; }
          const sectionId = lc.section;
          const section = homePage.draft_content.sections.find(s => s.id === sectionId || s.id === 'demoTracks' && sectionId === 'tracks');
          if (section && managedContent) {
            // Merge managed content fields into the section's elements for this language
            for (const [field, value] of Object.entries(managedContent)) {
              if (typeof value === 'string' && section.elements[field]) {
                section.elements[field][lc.language] = value;
              }
            }
            result.landingMerged++;
          }
        }
      } catch { /* LandingContent may not exist — ignore */ }
    }

    // Create CmsPage records
    for (const page of defaults.pages) {
      const existing = await base44.asServiceRole.entities.CmsPage.filter({ slug: page.slug });
      if (existing.length) {
        result.pagesSkipped++;
        continue;
      }
      const contentJson = JSON.stringify(page.draft_content);
      await base44.asServiceRole.entities.CmsPage.create({
        slug: page.slug,
        title: page.title,
        nav_label: '',
        seo_title: '',
        seo_description: '',
        og_title: '',
        og_description: '',
        og_image: '',
        is_indexable: true,
        status: 'published',
        nav_visible: page.nav_visible || false,
        footer_visible: page.footer_visible || false,
        display_order: page.display_order || 0,
        draft_content: contentJson,
        published_content: contentJson,
        previous_published_content: '',
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      result.pagesCreated++;
    }

    // Create CmsSetting records
    for (const [key, value] of Object.entries(defaults.settings)) {
      const existing = await base44.asServiceRole.entities.CmsSetting.filter({ key });
      if (existing.length) {
        result.settingsSkipped++;
        continue;
      }
      const valueJson = JSON.stringify(value);
      await base44.asServiceRole.entities.CmsSetting.create({
        key,
        draft_value: valueJson,
        published_value: valueJson,
        previous_published_value: '',
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      result.settingsCreated++;
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}