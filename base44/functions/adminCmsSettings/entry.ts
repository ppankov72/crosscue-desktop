import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin: manage CMS settings (navigation, footer, theme).
// Actions: get, save, publish, rollback.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || 'get';
    const now = new Date().toISOString();

    if (action === 'get') {
      const settings = await base44.asServiceRole.entities.CmsSetting.list('-created_date', 100);
      const result = {};
      for (const s of settings) {
        result[s.key] = {
          draft: s.draft_value ? JSON.parse(s.draft_value) : null,
          published: s.published_value ? JSON.parse(s.published_value) : null,
          previous: s.previous_published_value ? JSON.parse(s.previous_published_value) : null,
          published_at: s.published_at,
          modified_at: s.modified_at,
          modified_by: s.modified_by,
        };
      }
      return Response.json({ settings: result });
    }

    if (action === 'save') {
      const key = body.key;
      if (!key) return Response.json({ error: 'key required' }, { status: 400 });
      const valueJson = JSON.stringify(body.value);
      const existing = await base44.asServiceRole.entities.CmsSetting.filter({ key });
      if (!existing.length) {
        await base44.asServiceRole.entities.CmsSetting.create({
          key,
          draft_value: valueJson,
          published_value: '',
          previous_published_value: '',
          modified_at: now,
          modified_by: user.email,
        });
      } else {
        await base44.asServiceRole.entities.CmsSetting.update(existing[0].id, {
          draft_value: valueJson,
          modified_at: now,
          modified_by: user.email,
        });
      }
      return Response.json({ ok: true });
    }

    if (action === 'publish') {
      const key = body.key;
      if (!key) return Response.json({ error: 'key required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.CmsSetting.filter({ key });
      if (!existing.length) return Response.json({ error: 'Setting not found' }, { status: 404 });
      const s = existing[0];
      if (!s.draft_value) return Response.json({ error: 'No draft to publish' }, { status: 400 });
      const previousPublished = s.published_value || '';
      await base44.asServiceRole.entities.CmsSetting.update(s.id, {
        published_value: s.draft_value,
        previous_published_value: previousPublished,
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      return Response.json({ ok: true });
    }

    if (action === 'rollback') {
      const key = body.key;
      if (!key) return Response.json({ error: 'key required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.CmsSetting.filter({ key });
      if (!existing.length) return Response.json({ error: 'Setting not found' }, { status: 404 });
      const s = existing[0];
      if (!s.previous_published_value) return Response.json({ error: 'No previous version' }, { status: 400 });
      const currentPublished = s.published_value || '';
      await base44.asServiceRole.entities.CmsSetting.update(s.id, {
        published_value: s.previous_published_value,
        previous_published_value: currentPublished,
        published_at: now,
        modified_at: now,
        modified_by: user.email,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}