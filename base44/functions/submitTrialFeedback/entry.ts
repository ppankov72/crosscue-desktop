// Submit post-trial feedback (score 1-10, use again, comment).
// Identified by trial_token (anonymous) — no auth required.
// Idempotent: re-submission overwrites the existing feedback.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const trialToken = String(body.trialToken || '').trim();
    const score = Math.min(10, Math.max(1, Math.round(Number(body.score) || 0)));
    const useAgain = ['yes', 'maybe', 'no'].includes(body.useAgain) ? body.useAgain : 'maybe';
    const comment = String(body.comment || '').slice(0, 2000);

    if (!trialToken) return Response.json({ error: 'token_required' }, { status: 400 });
    if (!score || score < 1 || score > 10) return Response.json({ error: 'invalid_score' }, { status: 400 });

    const profiles = await base44.asServiceRole.entities.TrialProfile.filter({ trial_token: trialToken }, '-created_date', 1);
    if (profiles.length === 0) return Response.json({ error: 'not_found' }, { status: 404 });
    const profile = profiles[0];

    await base44.asServiceRole.entities.TrialProfile.update(profile.id, {
      feedback_score: score,
      feedback_use_again: useAgain,
      feedback_comment: comment,
      feedback_submitted_at: new Date().toISOString()
    });

    return Response.json({ ok: true, feedbackSubmitted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}