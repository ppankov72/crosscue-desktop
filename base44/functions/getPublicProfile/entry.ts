import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { toPublicProfile, isProfileVisibleTo } from '../../shared/profiles.ts';
import { pickBestEntitlement } from '../../shared/permissionSystem.ts';

// Get a public DJ Profile by slug.
// Respects visibility: public/unlisted = visible, private = hidden (except owner/admin).
// Hidden by moderation = only admin can see.
// NEVER exposes email, IP, internal IDs, risk scores, entitlement internals.
// Safely includes premium badge status (boolean only — no expiry/payment data).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch {}
    const slug = body.slug || '';
    if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

    // Find profile by slug
    const profiles = await base44.asServiceRole.entities.DjProfile.filter({ slug }, '-created_date', 1);
    if (profiles.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const profile = profiles[0];

    // Determine viewer
    let viewerUserId = null;
    let viewerIsAdmin = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        viewerUserId = user.id;
        viewerIsAdmin = user.role === 'admin' || (user as any).custom_role === 'owner' ||
                       (user as any).custom_role === 'super_admin' || (user as any).custom_role === 'admin';
      }
    } catch {}

    // Visibility check — backend enforced
    if (!isProfileVisibleTo(profile, viewerUserId, viewerIsAdmin)) {
      return Response.json({ error: 'private_profile' }, { status: 403 });
    }

    // Get public-safe profile projection
    const publicProfile = toPublicProfile(profile);
    if (!publicProfile) {
      return Response.json({ error: 'profile_unavailable' }, { status: 403 });
    }

    // Safely determine premium badge — boolean only, no internal data
    let isPremium = false;
    try {
      const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ user_id: profile.user_id }, '-created_date', 10);
      const activeEnt = pickBestEntitlement(entitlements, new Date());
      isPremium = activeEnt?.type === 'premium';
    } catch {}

    publicProfile.is_premium = isPremium;

    return Response.json({
      profile: publicProfile
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}