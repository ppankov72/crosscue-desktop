import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isBugStatus, isFeatureStatus } from '../../shared/feedbackSanitizer.ts';

// Phase G.1 — Admin: list bug reports and feature requests with filters and overview counts.
// Admin only — returns 403 for non-admins.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}

    const bugStatusFilter = isBugStatus(body.bug_status) ? body.bug_status : null;
    const bugSearch = String(body.bug_search || '').trim().toLowerCase();
    const featureStatusFilter = isFeatureStatus(body.feature_status) ? body.feature_status : null;
    const featureSearch = String(body.feature_search || '').trim().toLowerCase();

    // Fetch all bug reports (admin)
    const allBugs = await base44.asServiceRole.entities.CrosscueBugReport.list('-created_date', 500);
    let bugs = allBugs;
    if (bugStatusFilter) bugs = bugs.filter(b => b.status === bugStatusFilter);
    if (bugSearch) bugs = bugs.filter(b =>
      (b.title || '').toLowerCase().includes(bugSearch) ||
      (b.description || '').toLowerCase().includes(bugSearch) ||
      (b.reporter_email || '').toLowerCase().includes(bugSearch)
    );

    // Fetch all feature requests (admin)
    const allFeatures = await base44.asServiceRole.entities.CrosscueFeatureRequest.list('-created_date', 500);
    let features = allFeatures;
    if (featureStatusFilter) features = features.filter(f => f.status === featureStatusFilter);
    if (featureSearch) features = features.filter(f =>
      (f.title || '').toLowerCase().includes(featureSearch) ||
      (f.description || '').toLowerCase().includes(featureSearch) ||
      (f.author_email || '').toLowerCase().includes(featureSearch)
    );

    // Overview counts (from ALL records, not filtered)
    const openBugs = allBugs.filter(b => ['new', 'confirmed', 'in_progress'].includes(b.status)).length;
    const criticalBugs = allBugs.filter(b => b.severity === 'critical').length;
    const highBugs = allBugs.filter(b => b.severity === 'high').length;
    const underReview = allFeatures.filter(f => f.status === 'under_review').length;
    const planned = allFeatures.filter(f => f.status === 'planned').length;
    const totalVotes = allFeatures.reduce((sum, f) => sum + (f.vote_count || 0), 0);

    return Response.json({
      bugs: bugs.map(b => ({
        id: b.id,
        reporter_email: b.reporter_email,
        title: b.title,
        description: b.description,
        category: b.category,
        severity: b.severity,
        app_area: b.app_area,
        browser: b.browser,
        os: b.os,
        device_type: b.device_type,
        route: b.route,
        reproduction_steps: b.reproduction_steps,
        status: b.status,
        admin_notes: b.admin_notes,
        created_at: b.created_date
      })),
      features: features.map(f => ({
        id: f.id,
        author_email: f.author_email,
        title: f.title,
        description: f.description,
        category: f.category,
        status: f.status,
        vote_count: f.vote_count || 0,
        admin_response: f.admin_response,
        created_at: f.created_date
      })),
      overview: {
        total_bugs: allBugs.length,
        open_bugs: openBugs,
        critical_bugs: criticalBugs,
        high_bugs: highBugs,
        total_features: allFeatures.length,
        under_review: underReview,
        planned: planned,
        total_votes: totalVotes
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}