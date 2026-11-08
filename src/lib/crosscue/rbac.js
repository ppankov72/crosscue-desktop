// Frontend RBAC helpers — mirrors base44/shared/rbac.ts
// Used for UI visibility only — backend independently enforces permissions.

export const ROLES = {
  OWNER: 'owner',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  TESTER: 'tester',
  MEMBER: 'member'
};

export const ROLE_DISPLAY = {
  owner: 'MC Mister G.',
  super_admin: 'Backstage Crew',
  admin: 'Backstage Crew',
  moderator: 'MC',
  support: 'Backstage Crew',
  tester: 'Guest DJ',
  member: 'DJ'
};

export const ROLE_DISPLAY_LONG = {
  owner: 'MC Mister G. · Owner',
  super_admin: 'Backstage Crew · Super Admin',
  admin: 'Backstage Crew · Admin',
  moderator: 'MC · Community Moderator',
  support: 'Backstage Crew · Support',
  tester: 'Guest DJ · Tester',
  member: 'DJ'
};

export const ROLE_LEVEL = {
  owner: 100,
  super_admin: 90,
  admin: 80,
  moderator: 50,
  support: 40,
  tester: 30,
  member: 10
};

const ROLE_PERMISSIONS = {
  owner: ['*'], // all permissions
  super_admin: ['admin.dashboard.view', 'admin.analytics.view', 'users.view', 'users.edit', 'users.block', 'profiles.view', 'profiles.moderate', 'trials.view', 'trials.extend', 'trials.reset', 'trials.block', 'entitlements.view', 'entitlements.grant', 'entitlements.revoke', 'subscriptions.view', 'subscriptions.manage', 'payments.view', 'payments.refund', 'invitations.create', 'invitations.revoke', 'guest_testers.manage', 'community.moderate', 'system.settings.view', 'system.settings.edit', 'audit.view'],
  admin: ['admin.dashboard.view', 'admin.analytics.view', 'users.view', 'users.edit', 'profiles.view', 'profiles.moderate', 'trials.view', 'trials.extend', 'trials.reset', 'trials.block', 'entitlements.view', 'entitlements.grant', 'entitlements.revoke', 'subscriptions.view', 'payments.view', 'invitations.create', 'guest_testers.manage', 'community.moderate', 'audit.view'],
  moderator: ['profiles.view', 'profiles.moderate', 'community.moderate', 'trials.view'],
  support: ['users.view', 'trials.view', 'trials.extend', 'entitlements.view', 'subscriptions.view', 'payments.view'],
  tester: [],
  member: []
};

export function getCustomRole(user) {
  return user?.custom_role || ROLES.MEMBER;
}

export function hasPermission(user, permission) {
  const role = getCustomRole(user);
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

export function hasAnyPermission(user, permissions) {
  return permissions.some(p => hasPermission(user, p));
}

export function isAdminLevel(user) {
  const role = getCustomRole(user);
  return [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPPORT].includes(role);
}

export function isOwner(user) {
  return getCustomRole(user) === ROLES.OWNER;
}

export function getRoleDisplay(user) {
  const role = getCustomRole(user);
  return ROLE_DISPLAY[role] || 'DJ';
}

export function getRoleDisplayLong(user) {
  const role = getCustomRole(user);
  return ROLE_DISPLAY_LONG[role] || 'DJ';
}