/**
 * Meta Facebook Developer Configuration
 * Centralized API versioning and permission scopes
 */

export const META_CONFIG = {
  graphApiVersion: process.env.META_GRAPH_API_VERSION || "v21.0",
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  redirectUri:
    process.env.META_OAUTH_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/callback`,
  
  // Essential permissions required for Page Discovery, Management & Analytics
  scopes: [
    "pages_show_list",       // Required to list Facebook Pages managed by user
    "pages_read_engagement", // Required to read Page profile, metadata, and audience engagement
    "pages_manage_posts",    // Required to configure publishing & posts automation
    "read_insights",         // Required for official Page and Video Insights (Phase 2.6)
  ],
};

export function isMetaConfigured(): boolean {
  return Boolean(
    META_CONFIG.appId &&
    META_CONFIG.appSecret &&
    !META_CONFIG.appId.includes("your_meta") &&
    !META_CONFIG.appSecret.includes("your_meta")
  );
}

export function getGraphApiBaseUrl(): string {
  return `https://graph.facebook.com/${META_CONFIG.graphApiVersion}`;
}

export function getOAuthDialogUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: META_CONFIG.redirectUri,
    state,
    response_type: "code",
    scope: META_CONFIG.scopes.join(","),
  });

  return `https://www.facebook.com/${META_CONFIG.graphApiVersion}/dialog/oauth?${params.toString()}`;
}
