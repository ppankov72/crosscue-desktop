import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { pickBestEntitlement, evaluateTrial } from '../../shared/permissionSystem.ts';
import { ROLE_DISPLAY, ROLE_DISPLAY_LONG } from '../../shared/rbac.ts';
import { hasDeveloperAccess, isDevelopmentMode, getBypassReason } from '../../shared/developerAccess.ts';
import {
  generateDemoDisplayName, generateDemoSlug, generateDemoCode,
  generateAvatarSeed
} from '../../shared/profiles.ts';

// Phase E — Portal Overview aggregation endpoint.
// Aggregates profile, account, entitlement, trial, MYFEED link, and recent activity
// into a single response so the frontend doesn't make 12 sequential requests.
// All data is server-side ownership-enforced — user only sees their own data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const now = new Date();

    // 1. DJ Profile — Auto-creates initial demo profile if none exists
    let profile = null;
    try {
      let profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: userId }, '-created_date', 5);
      if (profiles.length === 0) {
        // Race condition protection: double-check before create
        const doubleCheck = await base44.asServiceRole.entities.DjProfile.filter({ user_id: userId }, '-created_date', 1);
        if (doubleCheck.length > 0) {
          profiles = doubleCheck;
        } else {
          const demoCode = generateDemoCode(userId);
          const avatarSeed = generateAvatarSeed(userId);
          const demoSlug = generateDemoSlug(userId);
          const demoDisplayName = generateDemoDisplayName(userId);

          try {
            const created = await base44.asServiceRole.entities.DjProfile.create({
              user_id: userId,
              display_name: demoDisplayName,
              slug: demoSlug,
              avatar_type: 'auto',
              avatar_seed: avatarSeed,
              bio: '',
              country: '',
              city: '',
              genres: '',
              website: '',
              visibility: 'private',
              show_country: false,
              show_city: false,
              show_website: false,
              show_social_links: true,
              social_links: '',
              is_demo: true,
              demo_code: demoCode,
              moderation_status: 'active'
            });
            profiles = [created];
          } catch (createErr) {
            // Concurrent request created it in the meantime; re-query
            profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: userId }, '-created_date', 1);
          }
        }
      }

      if (profiles.length > 0) {
        const p = profiles[0];
        profile = {
          id: p.id,
          user_id: p.user_id,
          display_name: p.display_name || '',
          slug: p.slug || '',
          avatar_type: p.avatar_type || 'auto',
          avatar_url: p.avatar_url || '',
          avatar_seed: p.avatar_seed || '',
          bio: p.bio || '',
          country: p.country || '',
          city: p.city || '',
          genres: p.genres || '',
          website: p.website || '',
          visibility: p.visibility || 'private',
          show_country: p.show_country || false,
          show_city: p.show_city || false,
          show_website: p.show_website || false,
          show_social_links: p.show_social_links !== false,
          social_links: p.social_links || '',
          is_demo: p.is_demo || false,
          demo_code: p.demo_code || '',
          moderation_status: p.moderation_status || 'active'
        };
      }
    } catch (profileErr) {
      console.error('[getPortalAccountStatus] DJ profile error:', profileErr);
    }

    // 2. Account
    const account = {
      id: userId, email: user.email, full_name: user.full_name || '',
      role: user.role, custom_role: (user as any).custom_role || 'member',
      account_status: (user as any).account_status || 'active',
      playback_override: (user as any).playback_override || false,
      role_display: ROLE_DISPLAY[(user as any).custom_role] || user.role,
      role_display_long: ROLE_DISPLAY_LONG[(user as any).custom_role] || user.role
    };

    // 3. Entitlements
    let entitlement = null;
    let trial = null;
    try {
      const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ user_id: userId }, '-created_date', 10);
      const best = pickBestEntitlement(entitlements, now);
      if (best) {
        const expiresAt = best.expires_at ? new Date(best.expires_at).getTime() : 0;
        entitlement = {
          type: best.type, status: best.status,
          starts_at: best.starts_at || '', expires_at: best.expires_at || '',
          source: best.source || '', manually_granted: best.manually_granted || false,
          remaining_seconds: best.type === 'premium' ? -1 : Math.max(0, Math.floor((expiresAt - now.getTime()) / 1000))
        };
      }
    } catch {}

    // 4. Trial
    try {
      const trials = await base44.asServiceRole.entities.Trial.filter({ user_id: userId }, '-created_date', 1);
      if (trials.length > 0) {
        const t = trials[0];
        trial = {
          id: t.id, status: t.status || 'active',
          trial_limit_seconds: t.trial_limit_seconds || 14400,
          playback_used_seconds: t.playback_used_seconds || 0,
          playback_remaining_seconds: t.playback_remaining_seconds || 0,
          risk_level: t.risk_level || 'low'
        };
      }
    } catch {}

    // 5. MYFEED Link
    let myfeed = null;
    try {
      const links = await base44.asServiceRole.entities.MyFeedLink.filter({ user_id: userId }, '-created_date', 1);
      if (links.length > 0) {
        const l = links[0];
        myfeed = {
          id: l.id, status: l.status || 'pending',
          myfeed_display_name: l.myfeed_display_name || '',
          myfeed_avatar_url: l.myfeed_avatar_url || '',
          myfeed_profile_url: l.myfeed_profile_url || '',
          linked_at: l.linked_at || '',
          last_sync_at: l.last_sync_at || '',
          share_activity_enabled: l.share_activity_enabled || false
        };
      }
    } catch {}

    // 6. Recent Trial Sessions (activity)
    let recentSessions = [];
    try {
      const sessions = await base44.asServiceRole.entities.TrialSession.filter({ user_id: userId }, '-created_date', 5);
      recentSessions = sessions.map(s => ({
        id: s.id, started: s.session_started_at || s.created_date || '',
        stopped: s.session_stopped_at || '',
        playback_active: s.playback_active || false,
        device_type: s.device_type || '', os: s.os || '', browser: s.browser || ''
      }));
    } catch {}

    // 7. Orders count
    let ordersCount = 0;
    try {
      const orders = await base44.asServiceRole.entities.Order.filter({ user_id: userId }, '-created_date', 100);
      ordersCount = orders.length;
    } catch {}

    // 8. Installation count
    let devicesCount = 0;
    try {
      const installations = await base44.asServiceRole.entities.Installation.filter({ first_user_id: userId }, '-last_seen_at', 100);
      devicesCount = installations.length;
    } catch {}

    return Response.json({
      profile, account, entitlement, trial, myfeed,
      recentSessions, ordersCount, devicesCount,
      developerAccess: hasDeveloperAccess(user),
      developmentMode: isDevelopmentMode(),
      bypassReason: getBypassReason(user),
      serverTime: now.toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}