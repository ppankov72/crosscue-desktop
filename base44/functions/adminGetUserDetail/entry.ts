import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';

// Admin: Get detailed user view with all sections.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'users.view')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const targetUserId = body.userId || '';
    if (!targetUserId) return Response.json({ error: 'userId required' }, { status: 400 });

    // Fetch user
    const targetUser = await base44.asServiceRole.entities.User.get(targetUserId);
    if (!targetUser) return Response.json({ error: 'user_not_found' }, { status: 404 });

    // Fetch profile
    const profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: targetUserId }, '-created_date', 1);
    const profile = profiles[0] || null;

    // Fetch entitlements
    const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ user_id: targetUserId }, '-created_date', 50);

    // Fetch trial
    const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: targetUserId }, '-created_date', 1);
    const trial = trials[0] || null;

    // Fetch installations
    const installations = trial?.installation_id
      ? await base44.asServiceRole.entities.Installation.filter({ installation_id: trial.installation_id }, '-created_date', 5)
      : [];

    // Fetch sessions
    const sessions = trial
      ? await base44.asServiceRole.entities.TrialSession.filter({ trial_id: trial.id }, '-created_date', 20)
      : [];

    // Fetch guest tester
    const guestTesters = await base44.asServiceRole.entities.GuestTester.filter({ user_id: targetUserId }, '-created_date', 1);
    const guestTester = guestTesters[0] || null;

    // Fetch subscriptions
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ user_id: targetUserId }, '-created_date', 10);

    // Fetch orders
    const orders = await base44.asServiceRole.entities.Order.filter({ user_id: targetUserId }, '-created_date', 20);

    // Fetch audit log entries for this user
    const auditLogs = await base44.asServiceRole.entities.AdminAuditLog.filter({ target_id: targetUserId }, '-created_date', 20);

    // Fetch MYFEED link status
    let myfeedLink = null;
    try {
      const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: targetUserId }, '-created_date', 1);
      if (links.length > 0) {
        const l = links[0];
        myfeedLink = {
          status: l.status || 'pending',
          myfeed_display_name: l.myfeed_display_name || '',
          linked_at: l.linked_at || '',
          last_sync_at: l.last_sync_at || '',
          last_status: l.last_status || ''
        };
      }
    } catch {}

    return Response.json({
      account: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name || '',
        role: targetUser.role,
        custom_role: (targetUser as any).custom_role || 'member',
        account_status: (targetUser as any).account_status || 'active',
        playback_override: (targetUser as any).playback_override || false,
        override_reason: (targetUser as any).override_reason || '',
        override_set_by: (targetUser as any).override_set_by || '',
        override_set_at: (targetUser as any).override_set_at || '',
        created_date: targetUser.created_date
      },
      profile: profile ? {
        id: profile.id,
        display_name: profile.display_name || '',
        slug: profile.slug || '',
        avatar_type: profile.avatar_type || 'auto',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
        country: profile.country || '',
        genres: profile.genres || '',
        visibility: profile.visibility || 'private',
        is_demo: profile.is_demo || false,
        moderation_status: profile.moderation_status || 'active',
        social_links: profile.social_links || ''
      } : null,
      entitlements: entitlements.map((e: any) => ({
        id: e.id,
        type: e.type,
        status: e.status,
        source: e.source,
        starts_at: e.starts_at,
        expires_at: e.expires_at,
        manually_granted: e.manually_granted,
        granted_by: e.granted_by,
        revoked_at: e.revoked_at,
        revoke_reason: e.revoke_reason
      })),
      trial: trial ? {
        id: trial.id,
        status: trial.status,
        used_seconds: trial.playback_used_seconds || 0,
        remaining_seconds: trial.playback_remaining_seconds || 0,
        limit_seconds: trial.trial_limit_seconds || 0,
        risk_score: trial.risk_score || 0,
        risk_level: trial.risk_level || 'low',
        activated_at: trial.activated_at,
        last_activity_at: trial.last_activity_at,
        blocked_at: trial.blocked_at,
        block_reason: trial.block_reason || ''
      } : null,
      installations: installations.map((i: any) => ({
        id: i.id,
        installation_id: i.installation_id,
        browser: i.browser_family,
        os: i.os_family,
        device: i.device_type,
        first_seen: i.first_seen_at,
        last_seen: i.last_seen_at,
        first_ip: i.first_ip,
        last_ip: i.last_ip,
        first_country: i.first_country,
        last_country: i.last_country,
        risk_score: i.risk_score || 0,
        flagged: i.flagged || false
      })),
      sessions: sessions.slice(0, 10).map((s: any) => ({
        id: s.id,
        started_at: s.session_started_at,
        stopped_at: s.session_stopped_at,
        accumulated: s.accumulated_playback_seconds || 0,
        active: s.playback_active,
        end_reason: s.end_reason || '',
        ip: s.ip,
        country: s.country
      })),
      guestTester: guestTester ? {
        id: guestTester.id,
        tester_name: guestTester.tester_name || '',
        professional_role: guestTester.professional_role || '',
        campaign: guestTester.campaign || '',
        test_started_at: guestTester.test_started_at,
        test_completed_at: guestTester.test_completed_at,
        test_notes: guestTester.test_notes || '',
        bugs_reported_count: guestTester.bugs_reported_count || 0,
        feature_requests_count: guestTester.feature_requests_count || 0,
        final_assessment: guestTester.final_assessment || 'not_started'
      } : null,
      subscriptions: subscriptions.map((s: any) => ({
        id: s.id,
        plan_code: s.plan_code,
        provider: s.provider,
        status: s.status,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end
      })),
      orders: orders.map((o: any) => ({
        id: o.id,
        plan_code: o.plan_code,
        plan_name: o.plan_name,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
        created_at: o.created_at_snapshot,
        completed_at: o.completed_at
      })),
      auditHistory: auditLogs.map((a: any) => ({
        id: a.id,
        admin_email: a.admin_email,
        action: a.action,
        old_value: a.old_value,
        new_value: a.new_value,
        reason: a.reason,
        created_date: a.created_date
      })),
      myfeedLink
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}