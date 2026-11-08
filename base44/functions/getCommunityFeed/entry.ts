import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getCommunityFeed } from '../../shared/myFeedConnector.ts';

// Phase E — Read MYFEED community feed (scope: community:read).
// Returns a compact social layer — limited items, safe projection.
// MYFEED failure returns a controlled error, does NOT crash the Portal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const limit = Math.min(Math.max(body.limit || 20, 1), 50); // cap 1-50
    const offset = Math.max(body.offset || 0, 0);

    // Call MYFEED API to get community feed
    const result = await getCommunityFeed(limit, offset);
    if (!result.ok) {
      return Response.json({
        error: result.error || 'myfeed_community_failed',
        items: [],
        total: 0
      }, { status: 502 });
    }

    // Normalize and return safe items — MYFEED uses "posts" array
    const posts = result.data.posts || [];
    const items = posts.map(item => ({
      id: item.id || '',
      author: item.author_name || item.author || '',
      avatar: item.author_avatar || item.avatar || '',
      content: item.content || '',
      timestamp: item.created_date || item.created_at || '',
      likes: item.likes_count || 0,
      comments: item.comments_count || 0
    }));

    return Response.json({
      items,
      total: result.data.total || items.length,
      hasMore: (offset + items.length) < (result.data.total || items.length)
    });
  } catch (error) {
    return Response.json({ error: error.message, items: [], total: 0 }, { status: 500 });
  }
}