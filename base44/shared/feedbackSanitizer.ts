// Phase G.1 — Shared sanitization and validation for community feedback.
// Used by submitBugReport, submitFeatureRequest, voteForFeature, and admin functions.

export const BUG_CATEGORIES = [
  "player", "mixer", "library", "playlist", "midi",
  "recording", "portal", "community", "mobile", "integration", "other"
] as const;

export const BUG_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const BUG_STATUSES = ["new", "confirmed", "in_progress", "resolved", "closed", "rejected"] as const;
export const FEATURE_STATUSES = ["submitted", "under_review", "planned", "in_progress", "released", "declined"] as const;

export function isBugCategory(v: string): boolean {
  return (BUG_CATEGORIES as readonly string[]).includes(v);
}
export function isBugSeverity(v: string): boolean {
  return (BUG_SEVERITIES as readonly string[]).includes(v);
}
export function isBugStatus(v: string): boolean {
  return (BUG_STATUSES as readonly string[]).includes(v);
}
export function isFeatureStatus(v: string): boolean {
  return (FEATURE_STATUSES as readonly string[]).includes(v);
}

// Strip HTML tags and dangerous characters — prevents stored XSS.
export function sanitizeText(value: string, maxLength: number = 500): string {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength)
    .trim();
}

export function sanitizeLongText(value: string, maxLength: number = 3000): string {
  return sanitizeText(value, maxLength);
}

// Extract safe browser/OS info from User-Agent — no fingerprinting, no version precision.
export function extractBrowserInfo(userAgent: string): { browser: string; os: string; device_type: string } {
  const ua = (userAgent || "").toLowerCase();
  let browser = "Unknown";
  let os = "Unknown";
  let device_type = "Desktop";

  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") || ua.includes("crios/")) browser = "Chrome";
  else if (ua.includes("firefox/") || ua.includes("fxios/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";

  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) device_type = "Mobile";
  else if (ua.includes("ipad") || ua.includes("tablet")) device_type = "Tablet";

  return { browser, os, device_type };
}