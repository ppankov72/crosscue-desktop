// Phase F — Developer access policy.
// SINGLE source of truth for developer/owner bypass logic.
// Used by: getPlaybackPermission, trialHeartbeat, admin functions.
//
// IMPORTANT: Developer bypass is SEPARATE from admin role.
// - playback_override: explicit per-user flag (manual grant)
// - isDevelopmentMode: environment-based (local dev only)
// - Owner role: automatic full access (but still audit-logged)

// ============================================================
// DEVELOPMENT MODE DETECTION
// ============================================================
// In local development, we allow a relaxed mode for testing.
// In production, this is always false.
export function isDevelopmentMode(): boolean {
  // Check for explicit development flag
  // This can be set via a secret or environment variable
  const devFlag = (process.env.CROSSCUE_DEV_MODE || "").toLowerCase();
  return devFlag === "true" || devFlag === "1" || devFlag === "yes";
}

// ============================================================
// OWNER BYPASS
// ============================================================
// Owner role gets automatic full access.
// This is NOT the same as playback_override — owner is a role,
// playback_override is an explicit per-user flag.
// Both are checked, but owner is checked first.
export function isOwner(user: any): boolean {
  const role = user?.custom_role || user?.role || "";
  return role === "owner";
}

// ============================================================
// DEVELOPER ACCESS CHECK
// ============================================================
// A "developer" is someone who can bypass entitlements for testing.
// This includes:
// 1. Owner role (automatic)
// 2. Users with playback_override=true (explicit grant)
// 3. Development mode (environment-based, local only)
export function hasDeveloperAccess(user: any): boolean {
  if (!user) return false;
  if (isDevelopmentMode()) return true;
  if (isOwner(user)) return true;
  if (user.playback_override === true) return true;
  return false;
}

// ============================================================
// BYPASS REASON (for audit logging)
// ============================================================
export function getBypassReason(user: any): string {
  if (!user) return "";
  if (isDevelopmentMode()) return "development_mode";
  if (isOwner(user)) return "owner_role";
  if (user.playback_override === true) return "playback_override";
  return "";
}

// ============================================================
// ADMIN PANEL ACCESS
// ============================================================
// Admin panel access is separate from developer access.
// Uses the RBAC system from rbac.ts.
// This is just a convenience wrapper.
export function canAccessAdminPanel(user: any): boolean {
  const role = user?.custom_role || user?.role || "";
  return ["owner", "super_admin", "admin", "moderator", "support"].includes(role);
}