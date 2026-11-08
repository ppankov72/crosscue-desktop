import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  generateDemoDisplayName, generateDemoSlug, generateDemoCode,
  generateAvatarSeed, getAutoAvatarType
} from '../../shared/profiles.ts';

// Get or create the current user's DJ Profile.
// New Trial users automatically get a DJ Demo profile.
// Existing Trial data is preserved — this function NEVER resets trial time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find existing profile
    const profiles = await base44.asServiceRole.entities.DjProfile.filter({ user_id: user.id }, '-created_date', 1);
    if (profiles.length > 0) {
      const profile = profiles[0];
      // Return with account info
      return Response.json({
        profile: formatProfile(profile),
        account: {
          id: user.id,
          email: user.email,
          full_name: user.full_name || '',
          role: user.role,
          custom_role: (user as any).custom_role || 'member',
          account_status: (user as any).account_status || 'active',
          playback_override: (user as any).playback_override || false
        }
      });
    }

    // No profile yet — create DJ Demo profile automatically
    const userId = user.id;
    const demoCode = generateDemoCode(userId);
    const avatarSeed = generateAvatarSeed(userId);

    const newProfile = await base44.asServiceRole.entities.DjProfile.create({
      user_id: userId,
      display_name: generateDemoDisplayName(userId),
      slug: generateDemoSlug(userId),
      avatar_type: 'auto',
      avatar_seed: avatarSeed,
      bio: '',
      country: '',
      genres: '',
      visibility: 'private', // demo profiles start private
      is_demo: true,
      demo_code: demoCode
    });

    return Response.json({
      profile: formatProfile(newProfile),
      account: {
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        role: user.role,
        custom_role: (user as any).custom_role || 'member',
        account_status: (user as any).account_status || 'active',
        playback_override: (user as any).playback_override || false
      },
      isNew: true
    });
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
    moderation_status: p.moderation_status || 'active',
    created_at: p.created_date,
    updated_at: p.updated_date
  };
}