// Returning anonymous user — restore remaining trial time by trial_token.
// No auth required. Returns only non-sensitive trial state.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { TRIAL_LIMIT_SECONDS } from '../../shared/trialSystem.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const trialToken = String(body.trialToken || '').trim();
    if (!trialToken) return Response.json({ error: 'token_required' }, { status: 400 });

    const profiles = await base44.asServiceRole.entities.TrialProfile.filter({ trial_token: trialToken }, '-created_date', 1);
    if (profiles.length === 0) return Response.json({ notFound: true });

    const profile = profiles[0];
    await base44.asServiceRole.entities.TrialProfile.update(profile.id, { last_seen_at: new Date().toISOString() });

    const trial = profile.trial_id ? await base44.asServiceRole.entities.Trial.get(profile.trial_id) : null;

    return Response.json({
      trialToken: profile.trial_token,
      trialId: profile.trial_id || '',
      djNickname: profile.dj_nickname,
      avatarUrl: profile.avatar_url || '',
      email: profile.email,
      remainingSeconds: trial?.playback_remaining_seconds ?? TRIAL_LIMIT_SECONDS,
      usedSeconds: trial?.playback_used_seconds ?? 0,
      limitSeconds: trial?.trial_limit_seconds ?? TRIAL_LIMIT_SECONDS,
      status: trial?.status || 'active',
      feedbackSubmitted: Boolean(profile.feedback_score),
      welcomeEmailSent: Boolean(profile.welcome_email_sent)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}