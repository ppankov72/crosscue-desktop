// Phase C — Central RBAC (Role-Based Access Control) system.
// SINGLE source of truth for roles, permissions, and hierarchy.
// Used by: all admin backend functions, frontend permission checks.

// ============================================================
// TECHNICAL ROLES (backend/security)
// ============================================================
export const ROLES = {
  OWNER: 'owner',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  TESTER: 'tester',
  MEMBER: 'member'
} as const;

// Role hierarchy level — higher = more powerful
export const ROLE_LEVEL: Record<string, number> = {
  owner: 100,
  super_admin: 90,
  admin: 80,
  moderator: 50,
  support: 40,
  tester: 30,
  member: 10
};

// ============================================================
// CROSSCUE UI DISPLAY NAMES (human/musical)
// ============================================================
export const ROLE_DISPLAY: Record<string, string> = {
  owner: 'MC Mister G.',
  super_admin: 'Backstage Crew',
  admin: 'Backstage Crew',
  moderator: 'MC',
  support: 'Backstage Crew',
  tester: 'Guest DJ',
  member: 'DJ'
};

export const ROLE_DISPLAY_LONG: Record<string, string> = {
  owner: 'MC Mister G. · Owner',
  super_admin: 'Backstage Crew · Super Admin',
  admin: 'Backstage Crew · Admin',
  moderator: 'MC · Community Moderator',
  support: 'Backstage Crew · Support',
  tester: 'Guest DJ · Tester',
  member: 'DJ'
};

// ============================================================
// PERMISSIONS
// ============================================================
export const PERMISSIONS = {
  // Dashboard
  ADMIN_DASHBOARD_VIEW: 'admin.dashboard.view',
  ADMIN_ANALYTICS_VIEW: 'admin.analytics.view',
  // Users
  USERS_VIEW: 'users.view',
  USERS_EDIT: 'users.edit',
  USERS_BLOCK: 'users.block',
  // Profiles
  PROFILES_VIEW: 'profiles.view',
  PROFILES_MODERATE: 'profiles.moderate',
  // Trials
  TRIALS_VIEW: 'trials.view',
  TRIALS_EXTEND: 'trials.extend',
  TRIALS_RESET: 'trials.reset',
  TRIALS_BLOCK: 'trials.block',
  // Entitlements
  ENTITLEMENTS_VIEW: 'entitlements.view',
  ENTITLEMENTS_GRANT: 'entitlements.grant',
  ENTITLEMENTS_REVOKE: 'entitlements.revoke',
  // Subscriptions
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_REFUND: 'payments.refund',
  // Invitations
  INVITATIONS_CREATE: 'invitations.create',
  INVITATIONS_REVOKE: 'invitations.revoke',
  // Guest testers
  GUEST_TESTERS_MANAGE: 'guest_testers.manage',
  // Community
  COMMUNITY_MODERATE: 'community.moderate',
  // System
  SYSTEM_SETTINGS_VIEW: 'system.settings.view',
  SYSTEM_SETTINGS_EDIT: 'system.settings.edit',
  // Audit
  AUDIT_VIEW: 'audit.view',
  // Owner-only
  OWNER_MANAGE_ROLES: 'owner.manage_roles',
  OWNER_MANAGE_OVERRIDE: 'owner.manage_override'
} as const;

// Role → permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: Object.values(PERMISSIONS), // owner has ALL permissions
  super_admin: [
    PERMISSIONS.ADMIN_DASHBOARD_VIEW, PERMISSIONS.ADMIN_ANALYTICS_VIEW,
    PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_BLOCK,
    PERMISSIONS.PROFILES_VIEW, PERMISSIONS.PROFILES_MODERATE,
    PERMISSIONS.TRIALS_VIEW, PERMISSIONS.TRIALS_EXTEND, PERMISSIONS.TRIALS_RESET, PERMISSIONS.TRIALS_BLOCK,
    PERMISSIONS.ENTITLEMENTS_VIEW, PERMISSIONS.ENTITLEMENTS_GRANT, PERMISSIONS.ENTITLEMENTS_REVOKE,
    PERMISSIONS.SUBSCRIPTIONS_VIEW, PERMISSIONS.SUBSCRIPTIONS_MANAGE,
    PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_REFUND,
    PERMISSIONS.INVITATIONS_CREATE, PERMISSIONS.INVITATIONS_REVOKE,
    PERMISSIONS.GUEST_TESTERS_MANAGE,
    PERMISSIONS.COMMUNITY_MODERATE,
    PERMISSIONS.SYSTEM_SETTINGS_VIEW, PERMISSIONS.SYSTEM_SETTINGS_EDIT,
    PERMISSIONS.AUDIT_VIEW
  ],
  admin: [
    PERMISSIONS.ADMIN_DASHBOARD_VIEW, PERMISSIONS.ADMIN_ANALYTICS_VIEW,
    PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT,
    PERMISSIONS.PROFILES_VIEW, PERMISSIONS.PROFILES_MODERATE,
    PERMISSIONS.TRIALS_VIEW, PERMISSIONS.TRIALS_EXTEND, PERMISSIONS.TRIALS_RESET, PERMISSIONS.TRIALS_BLOCK,
    PERMISSIONS.ENTITLEMENTS_VIEW, PERMISSIONS.ENTITLEMENTS_GRANT, PERMISSIONS.ENTITLEMENTS_REVOKE,
    PERMISSIONS.SUBSCRIPTIONS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.INVITATIONS_CREATE,
    PERMISSIONS.GUEST_TESTERS_MANAGE,
    PERMISSIONS.COMMUNITY_MODERATE,
    PERMISSIONS.AUDIT_VIEW
  ],
  moderator: [
    PERMISSIONS.PROFILES_VIEW, PERMISSIONS.PROFILES_MODERATE,
    PERMISSIONS.COMMUNITY_MODERATE,
    PERMISSIONS.TRIALS_VIEW
  ],
  support: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.TRIALS_VIEW, PERMISSIONS.TRIALS_EXTEND,
    PERMISSIONS.ENTITLEMENTS_VIEW,
    PERMISSIONS.SUBSCRIPTIONS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW
  ],
  tester: [],
  member: []
};

// ============================================================
// RBAC HELPERS
// ============================================================
export function getCustomRole(user: any): string {
  return user?.custom_role || ROLES.MEMBER;
}

export function hasRole(user: any, role: string): boolean {
  return getCustomRole(user) === role;
}

export function hasAnyRole(user: any, roles: string[]): boolean {
  return roles.includes(getCustomRole(user));
}

export function hasPermission(user: any, permission: string): boolean {
  const role = getCustomRole(user);
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

export function hasAnyPermission(user: any, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

// Check if user can manage another user's role (privilege escalation prevention)
export function canManageRole(actor: any, targetRole: string): boolean {
  const actorRole = getCustomRole(actor);
  const actorLevel = ROLE_LEVEL[actorRole] || 0;
  const targetLevel = ROLE_LEVEL[targetRole] || 0;
  // Can only assign roles at or below your own level
  // Owner can assign anything; super_admin can assign up to admin; etc.
  if (actorRole === ROLES.OWNER) return true;
  if (targetRole === ROLES.OWNER) return false; // only owner can assign owner
  return actorLevel > targetLevel;
}

// Check if user is an admin-level role (for admin panel access)
export function isAdminLevel(user: any): boolean {
  const role = getCustomRole(user);
  return [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPPORT].includes(role as any);
}

// Check if user has playback override (separate from role)
export function hasPlaybackOverride(user: any): boolean {
  return Boolean(user?.playback_override);
}

// Check if account is active (not blocked/suspended)
export function isAccountActive(user: any): boolean {
  const status = user?.account_status || 'active';
  return status === 'active';
}