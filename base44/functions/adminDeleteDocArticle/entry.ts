import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// P2 — Admin delete article endpoint. Permanently deletes a DocumentationArticle.
// Admin-only: verifies user.role === 'admin'.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'Missing article id' }, { status: 400 });

    await base44.asServiceRole.entities.DocumentationArticle.delete(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}