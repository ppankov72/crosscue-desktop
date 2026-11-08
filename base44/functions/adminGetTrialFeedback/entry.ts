// Admin: Trial feedback analytics — aggregates TrialProfile feedback data.
// Returns summary metrics (total, average, distribution, yes/maybe/no) and
// individual feedback records with trial identity for comment inspection.
// Admin-only.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    // All TrialProfiles with feedback submitted
    const allProfiles = await base44.asServiceRole.entities.TrialProfile.list('-created_date', 1000);
    const withFeedback = allProfiles.filter((p: any) => p.feedback_score && p.feedback_score >= 1);

    const total = withFeedback.length;
    const scores = withFeedback.map((p: any) => p.feedback_score || 0);
    const sum = scores.reduce((a: number, b: number) => a + b, 0);
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    // Rating distribution 1-10
    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) distribution[i] = 0;
    scores.forEach((s: number) => { if (distribution[s] !== undefined) distribution[s]++; });

    // Yes / Maybe / No
    const yesCount = withFeedback.filter((p: any) => p.feedback_use_again === 'yes').length;
    const maybeCount = withFeedback.filter((p: any) => p.feedback_use_again === 'maybe').length;
    const noCount = withFeedback.filter((p: any) => p.feedback_use_again === 'no').length;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

    // Individual records (newest first), with comment
    const records = withFeedback
      .sort((a: any, b: any) => new Date(b.feedback_submitted_at || 0).getTime() - new Date(a.feedback_submitted_at || 0).getTime())
      .map((p: any) => ({
        id: p.id,
        trial_id: p.trial_id || '',
        email: p.email || '',
        dj_nickname: p.dj_nickname || '',
        feedback_score: p.feedback_score,
        feedback_use_again: p.feedback_use_again || '',
        feedback_comment: p.feedback_comment || '',
        feedback_submitted_at: p.feedback_submitted_at || '',
        avatar_url: p.avatar_url || ''
      }));

    return Response.json({
      overview: {
        total_submissions: total,
        average_rating: average,
        distribution,
        yes_count: yesCount,
        maybe_count: maybeCount,
        no_count: noCount,
        yes_pct: pct(yesCount),
        maybe_pct: pct(maybeCount),
        no_pct: pct(noCount)
      },
      records
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}