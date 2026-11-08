import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public feature requests and vote counts for the landing community section.
// No auth required — public content only. No admin/private fields exposed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Check if user is authenticated (optional — for vote state)
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    let body = {};
    try { body = await req.json(); } catch {}
    const featureLimit = Math.min(Math.max(body.feature_limit || 10, 1), 50);

    // Fetch public feature requests (exclude 'declined')
    const allFeatures = await base44.asServiceRole.entities.CrosscueFeatureRequest.list('-created_date', 200);
    const publicFeatures = allFeatures
      .filter(f => f.status !== 'declined')
      .slice(0, featureLimit)
      .map(f => ({
        id: f.id,
        title: f.title,
        description: String(f.description || '').slice(0, 300),
        category: f.category,
        status: f.status,
        vote_count: f.vote_count || 0,
        admin_response: f.admin_response || '',
        created_at: f.created_date
      }));

    // If user is authenticated, get their vote state for each feature
    let userVotes: string[] = [];
    if (user) {
      const votes = await base44.asServiceRole.entities.CrosscueFeatureVote.filter({ user_id: user.id });
      userVotes = votes.map(v => v.feature_request_id);
    }

    // Sort features by vote count descending
    publicFeatures.sort((a, b) => b.vote_count - a.vote_count);

    return Response.json({
      features: publicFeatures,
      user_votes: userVotes,
      authenticated: Boolean(user)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}