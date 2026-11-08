// Phase C/D — DJ Profile helpers.
// DJ Demo auto-identity, slug generation, avatar generation, XSS sanitization,
// reserved slug protection, social URL validation, public profile filtering.

// ============================================================
// XSS SANITIZATION
// ============================================================
// Strip HTML tags and limit length for user-supplied text fields.
export function sanitizeText(input: string, maxLength: number = 200): string {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>"'&]/g, '') // strip dangerous chars
    .slice(0, maxLength)
    .trim();
}

export function sanitizeBio(input: string, maxLength: number = 500): string {
  return sanitizeText(input, maxLength);
}

// ============================================================
// RESERVED SLUG PROTECTION
// ============================================================
// Slugs that conflict with CROSSCUE routes or system names.
const RESERVED_SLUGS = [
  'admin', 'api', 'login', 'logout', 'account', 'settings', 'invite',
  'trial', 'commerce', 'system', 'support', 'crosscue',
  'landing', 'dj', 'deck', 'mixer', 'library', 'recording', 'midi',
  'analysis-test', 'users', 'invitations', 'payments', 'orders',
  'subscriptions', 'plans', 'profiles', 'sessions', 'installations'
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

// ============================================================
// SLUG GENERATION
// ============================================================
// Convert display name to URL-safe slug.
export function generateSlug(displayName: string): string {
  if (!displayName) return '';
  return String(displayName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Generate a unique slug with suffix if needed.
// Checks against reserved slugs and existing slugs.
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!baseSlug) baseSlug = 'dj';
  let slug = baseSlug;
  let suffix = 1;
  const slugSet = new Set(existingSlugs.map(s => s.toLowerCase()));
  // If base slug is reserved, prefix it
  if (isReservedSlug(slug)) {
    slug = `dj-${slug}`;
  }
  while (slugSet.has(slug.toLowerCase()) || isReservedSlug(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
    if (suffix > 999) break; // safety
  }
  return slug;
}

// ============================================================
// SOCIAL URL VALIDATION
// ============================================================
// Reject javascript:, data:, and other dangerous URL schemes.
// Only allow http/https URLs.
export function validateSocialUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Reject dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return '';
  // Allow http/https
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare domain — prepend https://
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

// Validate and sanitize a comma-separated list of social URLs.
export function validateSocialLinks(input: string, maxLength: number = 500): string {
  if (!input) return '';
  const urls = input.split(',').map(u => u.trim()).filter(Boolean);
  const valid = urls.map(u => validateSocialUrl(u)).filter(Boolean);
  return valid.join(',').slice(0, maxLength);
}

// ============================================================
// DJ DEMO AUTO-IDENTITY
// ============================================================
// Format: "DJ Demo · 15.08.2026 · K7F2"
// Last code: 4-char alphanumeric, deterministic from user_id
export function generateDemoDisplayName(userId: string): string {
  const date = new Date();
  const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  const code = generateDemoCode(userId);
  return `DJ Demo · ${dateStr} · ${code}`;
}

// Deterministic 4-char code from user_id (stable across sessions)
export function generateDemoCode(userId: string): string {
  if (!userId) return 'XXXX';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars (0/O, 1/I)
  const code = [];
  let h = Math.abs(hash);
  for (let i = 0; i < 4; i++) {
    code.push(chars[h % chars.length]);
    h = Math.floor(h / chars.length);
  }
  return code.join('');
}

// Generate a slug for demo profile
export function generateDemoSlug(userId: string): string {
  const code = generateDemoCode(userId).toLowerCase();
  return `dj-demo-${code}`;
}

// ============================================================
// AVATAR SYSTEM
// ============================================================
// CROSSCUE thematic avatar types — deterministic from seed
export const AVATAR_TYPES = ['vinyl', 'turntable', 'cassette', 'headphones', 'waveform', 'mixer', 'stylus', 'abstract'];

// Deterministic avatar selection from seed (user_id or profile_id)
export function getAutoAvatarType(seed: string): string {
  if (!seed) return AVATAR_TYPES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_TYPES[Math.abs(hash) % AVATAR_TYPES.length];
}

// Avatar seed for deterministic generation
export function generateAvatarSeed(userId: string): string {
  return userId || Math.random().toString(36).slice(2);
}

// ============================================================
// PUBLIC PROFILE FILTERING
// ============================================================
// Strip all private/internal fields before returning a public profile.
// Respects field-level visibility toggles (show_country, show_city, etc.).
export function toPublicProfile(profile: any): any {
  if (!profile) return null;
  // If moderation_status is 'hidden', treat as private
  if (profile.moderation_status === 'hidden') return null;
  return {
    id: profile.id,
    display_name: profile.display_name || '',
    slug: profile.slug || '',
    avatar_type: profile.avatar_type || 'auto',
    avatar_url: profile.avatar_url || '',
    avatar_seed: profile.avatar_seed || '',
    bio: profile.bio || '',
    // Field-level visibility — only include if user explicitly enabled
    country: profile.show_country ? (profile.country || '') : '',
    city: profile.show_city ? (profile.city || '') : '',
    website: profile.show_website ? (profile.website || '') : '',
    genres: profile.genres || '',
    social_links: profile.show_social_links ? (profile.social_links || '') : '',
    is_demo: profile.is_demo || false,
    // Moderation status — public can see if active/restored
    moderation_status: profile.moderation_status || 'active'
    // NEVER expose: user_id, email, internal IDs, risk scores, entitlement internals,
    // external_profile_provider, external_profile_id, moderation_reason, moderated_by, etc.
  };
}

// Check if a profile should be visible to a given viewer
export function isProfileVisibleTo(profile: any, viewerUserId: string | null, viewerIsAdmin: boolean): boolean {
  if (!profile) return false;
  // Hidden by moderation — only admins can see
  if (profile.moderation_status === 'hidden' && !viewerIsAdmin) return false;
  if (viewerIsAdmin) return true;
  if (profile.user_id === viewerUserId) return true;
  return profile.visibility === 'public' || profile.visibility === 'unlisted';
}

// Only public profiles appear in public lists/search
export function isProfilePubliclyListed(profile: any): boolean {
  return profile?.visibility === 'public' && profile?.moderation_status !== 'hidden';
}