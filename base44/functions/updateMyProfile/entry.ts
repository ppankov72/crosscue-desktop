import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sanitizeText, sanitizeBio, generateSlug, generateUniqueSlug,
  validateSocialLinks, validateSocialUrl, isReservedSlug,
  generateAvatarSeed, generateDemoCode
} from '../../shared/profiles.ts';
import { logSecurityEvent, SECURITY_EVENT_TYPES } from '../../shared/securityEvents.ts';

// Update the current user's DJ Profile.
// Field allowlist — client cannot set role, entitlement, account_status, moderation_status, etc.
// Slug uniqueness and reserved-slug protection enforced server-side.
// XSS protection via sanitizeText/sanitizeBio.
// Social URL validation rejects javascript:/data: schemes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const updates: any = {};

    // ALLOWLIST of user-editable fields only
    if (body.display_name !== undefined) {
      updates.display_name = sanitizeText(body.display_name, 60);
      // If profile was demo and user sets a real name, mark as non-demo
      if (updates.display_name && !updates.display_name.startsWith('DJ Demo')) {
        updates.is_demo = false;
      }
    }
    if (body.bio !== undefined) updates.bio = sanitizeBio(body.bio, 500);
    if (body.country !== undefined) updates.country = sanitizeText(body.country, 60);
    if (body.city !== undefined) updates.city = sanitizeText(body.city, 60);
    if (body.genres !== undefined) updates.genres = sanitizeText(body.genres, 200);
    if (body.website !== undefined) updates.website = validateSocialUrl(body.website);
    if (body.visibility !== undefined) {
      if (['public', 'unlisted', 'private'].includes(body.visibility)) {
        updates.visibility = body.visibility;
      }
    }
    // Field-level visibility toggles
    if (body.show_country !== undefined) updates.show_country = Boolean(body.show_country);
    if (body.show_city !== undefined) updates.show_city = Boolean(body.show_city);
    if (body.show_website !== undefined) updates.show_website = Boolean(body.show_website);
    if (body.show_social_links !== undefined) updates.show_social_links = Boolean(body.show_social_links);

    if (body.avatar_type !== undefined) {
      if (['auto', 'gallery', 'upload', 'text'].includes(body.avatar_type)) {
        updates.avatar_type = body.avatar_type;
      }
    }
    if (body.avatar_url !== undefined) {
      updates.avatar_url = sanitizeText(body.avatar_url, 500);
    }
    if (body.social_links !== undefined) {
      updates.social_links = validateSocialLinks(body.social_links, 500);
    }

    // Handle display_name → slug generation
    if (body.display_name !== undefined && updates.display_name) {
      const baseSlug = generateSlug(updates.display_name);
      if (baseSlug) {
        // Check slug uniqueness (exclude current user's profile)
        const existingProfiles = await base44.asServiceRole.entities.DjProfile.filter({}, '-created_date', 500);
        const existingSlugs = existingProfiles
          .filter((p: any) => p.user_id !== user.id)
          .map((p: any) => p.slug)
          .filter(Boolean);
        updates.slug = generateUniqueSlug(baseSlug, existingSlugs);
      }
    }

    // Track profile change timestamp
    updates.last_profile_change_at = new Date().toISOString();

    // Find current user's profile
    let profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: user.id }, '-created_date', 1);
    let profile = profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      // Defensive creation if profile did not exist yet
      const baseSlug = updates.slug || generateSlug(updates.display_name || user.full_name || 'DJ');
      const existingProfiles = await base44.asServiceRole.entities.DjProfile.filter({}, '-created_date', 500);
      const existingSlugs = existingProfiles.map((p: any) => p.slug).filter(Boolean);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

      profile = await base44.asServiceRole.entities.DjProfile.create({
        user_id: user.id,
        display_name: updates.display_name || user.full_name || 'DJ',
        slug: uniqueSlug,
        avatar_type: updates.avatar_type || 'auto',
        avatar_seed: generateAvatarSeed(user.id),
        avatar_url: updates.avatar_url || '',
        bio: updates.bio || '',
        country: updates.country || '',
        city: updates.city || '',
        genres: updates.genres || '',
        website: updates.website || '',
        visibility: updates.visibility || 'private',
        show_country: updates.show_country || false,
        show_city: updates.show_city || false,
        show_website: updates.show_website || false,
        show_social_links: updates.show_social_links !== false,
        social_links: updates.social_links || '',
        is_demo: false,
        demo_code: generateDemoCode(user.id),
        moderation_status: 'active'
      });

      return Response.json({ ok: true, profile: formatProfile(profile), isNew: true });
    }
    // DJ cannot modify moderation fields or external identity fields
    delete updates.moderation_status;
    delete updates.moderated_by;
    delete updates.moderated_at;
    delete updates.moderation_reason;
    delete updates.external_profile_provider;
    delete updates.external_profile_id;

    // Log security event for profile change
    const changedFields = Object.keys(updates).filter(k => k !== 'last_profile_change_at');
    if (changedFields.length > 0) {
      await logSecurityEvent(base44, user.id, SECURITY_EVENT_TYPES.PROFILE_CHANGED,
        `Profile updated: ${changedFields.join(', ')}`, req);
    }

    try {
      const updated = await base44.asServiceRole.entities.DjProfile.update(profile.id, updates);
      return Response.json({ ok: true, profile: formatProfile(updated) });
    } catch {
      // Fallback to bulkUpdate if update fails
      try {
        await base44.asServiceRole.entities.DjProfile.bulkUpdate([{ id: profile.id, ...updates }]);
        const refetched = await base44.asServiceRole.entities.DjProfile.get(profile.id);
        return Response.json({ ok: true, profile: formatProfile(refetched) });
      } catch (e) {
        return Response.json({ error: 'update_failed' }, { status: 500 });
      }
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function formatProfile(p: any): any {
  return {
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
    last_profile_change_at: p.last_profile_change_at || '',
    moderation_status: p.moderation_status || 'active'
  };
}