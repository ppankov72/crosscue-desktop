import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  ROLES, hasPermission, canManageRole, getCustomRole, ROLE_LEVEL
} from '../../shared/rbac.ts';

// Admin: List users with filters and pagination.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'users.view')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const search = body.search || '';
    const roleFilter = body.roleFilter || '';
    const statusFilter = body.statusFilter || '';
    const limit = Math.min(body.limit || 50, 200);
    const offset = body.offset || 0;

    // Fetch users (service role — admin only)
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);

    // Fetch profiles for display names
    const profiles = await base44.asServiceRole.entities.DjProfile.list('-created_date', 500);
    const profileMap = {};
    profiles.forEach((p: any) => { profileMap[p.user_id] = p; });

    // Fetch entitlements
    const entitlements = await base44.asServiceRole.entities.Entitlement.list('-created_date', 500);
    const entMap = {};
    entitlements.forEach((e: any) => {
      if (!entMap[e.user_id] || e.type === 'premium' || (e.type === 'weekend' && entMap[e.user_id].type === 'trial')) {
        entMap[e.user_id] = e;
      }
    });

    // Fetch trials
    const trials = await base44.asServiceRole.entities.Trial.list('-created_date', 500);
    const trialMap = {};
    trials.forEach((t: any) => { trialMap[t.user_id] = t; });

    let users = allUsers.map((u: any) => {
      const profile = profileMap[u.id] || {};
      const ent = entMap[u.id];
      const trial = trialMap[u.id];
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name || '',
        role: u.role,
        custom_role: u.custom_role || 'member',
        account_status: u.account_status || 'active',
        playback_override: u.playback_override || false,
        display_name: profile.display_name || '',
        slug: profile.slug || '',
        profile_visibility: profile.visibility || 'private',
        is_demo: profile.is_demo || false,
        moderation_status: profile.moderation_status || 'active',
        entitlement_type: ent?.type || 'none',
        entitlement_status: ent?.status || 'none',
        entitlement_expiry: ent?.expires_at || '',
        trial_status: trial?.status || 'none',
        trial_remaining: trial?.playback_remaining_seconds || 0,
        trial_limit: trial?.trial_limit_seconds || 0,
        created_date: u.created_date,
        last_activity: trial?.last_activity_at || ''
      };
    });

    // Apply filters
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(s) ||
        u.display_name.toLowerCase().includes(s) ||
        u.full_name.toLowerCase().includes(s)
      );
    }
    if (roleFilter) {
      users = users.filter(u => u.custom_role === roleFilter);
    }
    if (statusFilter) {
      users = users.filter(u => u.account_status === statusFilter);
    }

    const total = users.length;
    users = users.slice(offset, offset + limit);

    return Response.json({
      users,
      total,
      offset,
      limit
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}