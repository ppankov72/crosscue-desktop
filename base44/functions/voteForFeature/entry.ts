import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Phase G.1 — Vote or unvote for a feature request.
// Enforces ONE USER = ONE VOTE PER FEATURE server-side.
// Vote count is recalculated from actual CrosscueFeatureVote records — never trusted from browser.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const featureRequestId = String(body.feature_request_id || '').trim();
    const action = body.action === 'unvote' ? 'unvote' : 'vote';

    if (!featureRequestId) {
      return Response.json({ error: 'missing_feature_id' }, { status: 400 });
    }

    // Verify the feature request exists
    const features = await base44.asServiceRole.entities.CrosscueFeatureRequest.filter({ id: featureRequestId }, '-created_date', 1);
    if (features.length === 0) {
      return Response.json({ error: 'feature_not_found' }, { status: 404 });
    }

    // Check if user already voted (server-side uniqueness enforcement)
    const existingVotes = await base44.asServiceRole.entities.CrosscueFeatureVote.filter({
      feature_request_id: featureRequestId,
      user_id: user.id
    }, '-created_date', 1);

    const alreadyVoted = existingVotes.length > 0;

    if (action === 'vote') {
      if (alreadyVoted) {
        // Idempotent — already voted, return current count
        const allVotes = await base44.asServiceRole.entities.CrosscueFeatureVote.filter({ feature_request_id: featureRequestId });
        return Response.json({ ok: true, voted: true, vote_count: allVotes.length });
      }
      await base44.asServiceRole.entities.CrosscueFeatureVote.create({
        feature_request_id: featureRequestId,
        user_id: user.id,
        user_email: user.email || ''
      });
    } else {
      // unvote
      if (!alreadyVoted) {
        const allVotes = await base44.asServiceRole.entities.CrosscueFeatureVote.filter({ feature_request_id: featureRequestId });
        return Response.json({ ok: true, voted: false, vote_count: allVotes.length });
      }
      await base44.asServiceRole.entities.CrosscueFeatureVote.deleteMany({
        feature_request_id: featureRequestId,
        user_id: user.id
      });
    }

    // Recalculate vote count from actual records
    const allVotes = await base44.asServiceRole.entities.CrosscueFeatureVote.filter({ feature_request_id: featureRequestId });
    const newCount = allVotes.length;

    // Update the feature request's vote_count (transactional)
    await base44.asServiceRole.entities.CrosscueFeatureRequest.update(featureRequestId, { vote_count: newCount });

    return Response.json({
      ok: true,
      voted: action === 'vote',
      vote_count: newCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}