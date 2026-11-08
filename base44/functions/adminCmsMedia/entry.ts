import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin: manage CMS media library.
// Actions: list, create, delete.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const action = body.action || 'list';

    if (action === 'list') {
      const media = await base44.asServiceRole.entities.CmsMedia.list('-created_date', 200);
      return Response.json({ media });
    }

    if (action === 'create') {
      const created = await base44.asServiceRole.entities.CmsMedia.create({
        filename: body.filename || '',
        title: body.title || body.filename || '',
        alt_text: body.alt_text || '',
        description: body.description || '',
        url: body.url,
        width: body.width || 0,
        height: body.height || 0,
        uploaded_by: user.email,
      });
      return Response.json({ ok: true, id: created.id });
    }

    if (action === 'delete') {
      if (!body.media_id) return Response.json({ error: 'media_id required' }, { status: 400 });
      await base44.asServiceRole.entities.CmsMedia.delete(body.media_id);
      return Response.json({ ok: true });
    }

    if (action === 'update') {
      if (!body.media_id) return Response.json({ error: 'media_id required' }, { status: 400 });
      await base44.asServiceRole.entities.CmsMedia.update(body.media_id, {
        title: body.title,
        alt_text: body.alt_text,
        description: body.description,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}