// Frontend trial/permission configuration — mirrors base44/shared/permissionSystem.ts
export const FREE_TRIAL_LIMIT_SECONDS = 2400; // 40 minutes of actual playback
export const TRIAL_LIMIT_SECONDS = FREE_TRIAL_LIMIT_SECONDS; // alias — single source of truth on client
export const TRIAL_VALIDATION_INTERVAL_SECONDS = 5;
export const NETWORK_GRACE_SECONDS = 3;
export const HEARTBEAT_INTERVAL_SECONDS = 5;
export const HEARTBEAT_TIMEOUT_SECONDS = 30;
export const FADE_OUT_SECONDS = 2;
export const TRIAL_EXPIRY_GRACE_SECONDS = 60; // grace after 40:00 before hard fade-out
export const WARNING_10_MIN_SECONDS = 600;
export const WARNING_5_MIN_SECONDS = 300;
export const SHADOW_MODE = false;
export const ENFORCEMENT_MODE = true;
export const WEEKEND_PASS_DURATION_HOURS = 72;
export const WEEKEND_PASS_PRICE = 4.99;
export const PREMIUM_PRICE = 12.99;

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getRiskLevel(score) {
  if (score > 80) return 'critical';
  if (score > 60) return 'high';
  if (score > 30) return 'medium';
  return 'low';
}