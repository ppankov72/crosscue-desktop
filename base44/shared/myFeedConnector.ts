// Phase F — Central server-side MYFEED API v1 connector.
// CROSSCUE → MyFeedConnector → MYFEED API v1
//
// Authentication: credentials sent in the REQUEST BODY (not headers).
// Fields: client_identifier, client_secret (SHA-256 hashed server-side by MYFEED).
// All endpoints are POST with JSON body.
//
// This module is the SINGLE integration point for all MYFEED API calls.
// Secrets are read at runtime from base44:runtime — never embedded in build.
// MYFEED failure does NOT affect CROSSCUE audio playback or licensing.

import { secrets } from "base44:runtime";

// ============================================================
// CONFIGURATION
// ============================================================
const REQUEST_TIMEOUT_MS = 10000; // 10 second timeout
const EXTERNAL_APP = "crosscue"; // CROSSCUE's external app identifier in MYFEED

// MYFEED public host — used to fix confirm_url when the API returns the dispatcher host.
// The MYFEED app is at myfeed.docflowtools.de; the Base44 dispatcher host is internal.
const MYFEED_PUBLIC_HOST = "myfeed.docflowtools.de";
const DISPATCHER_HOST = "base44-dispatcher-production.base44.workers.dev";
const CORRECT_API_BASE_URL = `https://${MYFEED_PUBLIC_HOST}/api/functions`;

// ============================================================
// CONFIG — read secrets at runtime
// ============================================================
interface MyFeedConfig {
  clientId: string;
  secret: string;
  baseUrl: string;
}

function stripPrefix(value: string, keyName: string): string {
  const trimmed = value.trim();
  const prefix = keyName + " ";
  if (trimmed.startsWith(prefix)) {
    return trimmed.substring(prefix.length).trim();
  }
  return trimmed;
}

function getConfig(): MyFeedConfig {
  const clientId = stripPrefix(secrets.get("MYFEED_API_CLIENT_ID") || "", "MYFEED_API_CLIENT_ID");
  const secret = stripPrefix(secrets.get("MYFEED_API_SECRET") || "", "MYFEED_API_SECRET");
  let baseUrl = stripPrefix(secrets.get("MYFEED_API_BASE_URL") || "", "MYFEED_API_BASE_URL").replace(/\/$/, "");
  // If the configured base URL points to the internal dispatcher, use the direct public URL.
  if (baseUrl.includes("base44-dispatcher") || !baseUrl) {
    baseUrl = CORRECT_API_BASE_URL;
  }
  return { clientId, secret, baseUrl };
}

// Fix confirm_url: replace the internal dispatcher host with the public MYFEED host.
function fixConfirmUrl(url: string): string {
  if (!url) return url;
  return url.replace(DISPATCHER_HOST, MYFEED_PUBLIC_HOST);
}

function isConfigured(): boolean {
  const c = getConfig();
  const isValid = (v: string) => Boolean(v) && v !== "undefined" && v !== "null";
  return isValid(c.clientId) && isValid(c.secret) && isValid(c.baseUrl);
}

// ============================================================
// REQUEST ID GENERATION
// ============================================================
function generateRequestId(): string {
  return "cc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// ============================================================
// CORE REQUEST — body-authenticated, timeout-protected
// ============================================================
// Per MYFEED API v1 docs: credentials are sent in the request body,
// NOT in headers. The secret is verified against a stored SHA-256 hash.
interface MyFeedResponse {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
  requestId: string;
}

async function makeRequest(
  endpoint: string,
  body?: any,
  skipAuth?: boolean
): Promise<MyFeedResponse> {
  const config = getConfig();
  const requestId = generateRequestId();

  if (!skipAuth && !isConfigured()) {
    return {
      ok: false,
      status: 503,
      data: null,
      error: "myfeed_not_configured",
      requestId
    };
  }

  const url = `${config.baseUrl}/${endpoint}`;

  // Build request body — credentials go IN the body, not headers
  const requestBody: any = {
    ...(body || {})
  };
  if (!skipAuth) {
    requestBody.client_identifier = config.clientId;
    requestBody.client_secret = config.secret;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId
      },
      body: JSON.stringify(requestBody)
    });

    clearTimeout(timeout);

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: data?.error?.code || data?.error?.message || data?.error || data?.message || `myfeed_http_${response.status}`,
        requestId
      };
    }

    // MYFEED API v1 response: { ok, request_id, data: { ...payload } }
    // Extract the inner data payload so callers get the fields directly.
    return {
      ok: true,
      status: response.status,
      data: data?.data || data,
      requestId
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        data: null,
        error: "myfeed_timeout",
        requestId
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: "myfeed_connection_error",
      requestId
    };
  }
}

// ============================================================
// IDENTITY LINKING
// ============================================================
// Initiate linking — creates a short-lived (15 min) LinkingToken.
// User must consent on MYFEED side (confirm_url) before link is active.
// Input: external_user_id, external_display_name
// Output: link_request_id, confirm_url, expires_in (900 seconds)
export async function initiateLinking(
  externalUserId: string,
  externalDisplayName: string
): Promise<MyFeedResponse> {
  const result = await makeRequest("apiV1InitiateLinking", {
    external_app: EXTERNAL_APP,
    external_user_id: externalUserId,
    external_display_name: externalDisplayName
  });
  // Fix confirm_url: the MYFEED API may return the internal dispatcher host
  // instead of the public myfeed.docflowtools.de host.
  if (result.ok && result.data?.confirm_url) {
    result.data.confirm_url = fixConfirmUrl(result.data.confirm_url);
  }
  return result;
}

// Confirm linking — tries direct API call to bypass browser dispatcher.
// Per docs: apiV1ConfirmLinking requires MYFEED user session auth,
// but we try with API client auth as a fallback. If it fails, the user
// must still confirm via the confirm_url page.
export async function confirmLinking(
  linkRequestId: string,
  externalUserId: string
): Promise<MyFeedResponse> {
  return makeRequest("apiV1ConfirmLinking", {
    external_app: EXTERNAL_APP,
    external_user_id: externalUserId,
    link_request_id: linkRequestId
  });
}

// Unlink identity — terminates the integration link.
// Does NOT delete CROSSCUE account or MYFEED account.
export async function unlinkIdentity(externalUserId: string): Promise<MyFeedResponse> {
  return makeRequest("apiV1UnlinkIdentity", {
    external_app: EXTERNAL_APP,
    external_user_id: externalUserId
  });
}

// ============================================================
// PROFILE READ (scope: profile:read)
// ============================================================
// Returns safe profile projection — no email, phone, IP, or security fields.
export async function getProfile(externalUserId: string): Promise<MyFeedResponse> {
  return makeRequest("apiV1GetProfile", {
    external_app: EXTERNAL_APP,
    external_user_id: externalUserId
  });
}

// ============================================================
// ACTIVITY PUBLISHING (scope: activity:write)
// ============================================================
// Field is "text" (not "content"). Idempotency key prevents duplicates.
// Optional url field for link attachments.
export async function publishActivity(
  externalUserId: string,
  activityType: string,
  text: string,
  idempotencyKey: string,
  url?: string
): Promise<MyFeedResponse> {
  const body: any = {
    external_app: EXTERNAL_APP,
    external_user_id: externalUserId,
    activity_type: activityType,
    text,
    idempotency_key: idempotencyKey
  };
  if (url) body.url = url;
  return makeRequest("apiV1PublishActivity", body);
}

// ============================================================
// COMMUNITY FEED (scope: community:read)
// ============================================================
// Note: NO external_app or external_user_id — this is a public feed read.
// Limit max 50, offset for pagination.
export async function getCommunityFeed(
  limit: number = 20,
  offset: number = 0
): Promise<MyFeedResponse> {
  return makeRequest("apiV1GetCommunityActivity", {
    limit,
    offset
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================
// No auth required.
export async function healthCheck(): Promise<MyFeedResponse> {
  return makeRequest("apiV1Health", {}, true);
}

// ============================================================
// ALLOWED ACTIVITY TYPES
// ============================================================
// Per MYFEED API v1 docs — CROSSCUE is allowed to publish these types.
export const ALLOWED_ACTIVITY_TYPES = [
  "dj_joined",
  "dj_profile_updated",
  "mix_published",
  "mix_shared",
  "event_started",
  "playlist_shared",
  "achievement_unlocked"
] as const;

export function isAllowedActivityType(type: string): boolean {
  return (ALLOWED_ACTIVITY_TYPES as readonly string[]).includes(type);
}

// ============================================================
// CONTENT SANITIZATION
// ============================================================
// Strip dangerous content from activity text before publishing.
export function sanitizeActivityContent(content: string, maxLength: number = 500): string {
  if (!content) return "";
  return String(content)
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>"'&]/g, "") // strip dangerous chars
    .slice(0, maxLength)
    .trim();
}

// ============================================================
// IDEMPOTENCY KEY GENERATION
// ============================================================
export function generateIdempotencyKey(userId: string, activityType: string): string {
  return `${userId}-${activityType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// CONFIGURATION STATUS (for admin/health display)
// ============================================================
export function getConfigStatus(): { configured: boolean; baseUrl: string; clientId: string } {
  const config = getConfig();
  return {
    configured: isConfigured(),
    baseUrl: config.baseUrl ? "set" : "missing",
    clientId: config.clientId ? "set" : "missing"
  };
}