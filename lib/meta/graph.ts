import { getGraphApiBaseUrl } from "./config";

export interface DiscoveredFacebookPage {
  id: string; // Facebook Page ID
  name: string;
  category?: string;
  pictureUrl?: string;
  tasks: string[];
  accessToken: string; // Server-only, stripped before sending to client
  alreadyImported?: boolean;
}

export interface MetaAccountsResponse {
  data: Array<{
    id: string;
    name: string;
    category?: string;
    picture?: {
      data?: {
        url?: string;
        is_silhouette?: boolean;
      };
    };
    tasks?: string[];
    access_token?: string;
  }>;
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

/**
 * Fetches all Facebook Pages that the user is authorized to manage (`GET /me/accounts`).
 * Implements cursor-based pagination to support scale beyond 100+ Pages.
 */
export async function getManagedPages(userAccessToken: string): Promise<DiscoveredFacebookPage[]> {
  const allPages: DiscoveredFacebookPage[] = [];
  let nextUrl: string | null =
    `${getGraphApiBaseUrl()}/me/accounts?fields=id,name,category,picture{url},tasks,access_token&limit=50&access_token=${encodeURIComponent(userAccessToken)}`;

  let pageIterations = 0;
  const maxIterations = 10; // Supports up to 500 pages

  while (nextUrl && pageIterations < maxIterations) {
    pageIterations++;

    let response: Response;
    try {
      response = await fetch(nextUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (networkErr: any) {
      throw new Error(`Meta Graph API network connectivity error: ${networkErr?.message || "Timeout"}`);
    }

    const data: MetaAccountsResponse = await response.json();

    if (!response.ok || data.error) {
      const code = data.error?.code;
      const message = data.error?.message || "Failed to retrieve accessible Facebook Pages.";

      // Code 190: Invalid or expired OAuth access token
      if (code === 190) {
        throw new Error(`Meta session expired (Code 190): Please reconnect your Facebook account.`);
      }
      // Code 200: Permissions error
      if (code === 200) {
        throw new Error(`Meta permissions error (Code 200): Ensure 'pages_show_list' permission is granted.`);
      }
      // Code 4, 17, 32, 613: Rate limit reached
      if ([4, 17, 32, 613].includes(code || 0)) {
        throw new Error(`Meta API rate limit reached. Please wait a few moments before trying again.`);
      }

      throw new Error(`Meta Graph API error (${code}): ${message}`);
    }

    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        allPages.push({
          id: item.id,
          name: item.name,
          category: item.category || "General",
          pictureUrl: item.picture?.data?.url,
          tasks: item.tasks || [],
          accessToken: item.access_token || "",
        });
      }
    }

    nextUrl = data.paging?.next || null;
  }

  return allPages;
}

/**
 * Synchronizes detailed metadata for a single Facebook Page (`GET /{page_id}`).
 */
export async function getPageDetails(
  pageId: string,
  pageAccessToken: string
): Promise<{
  id: string;
  name: string;
  category?: string;
  pictureUrl?: string;
  followersCount: number;
  tasks?: string[];
}> {
  const url = `${getGraphApiBaseUrl()}/${pageId}?fields=id,name,category,picture{url},tasks,followers_count,fan_count&access_token=${encodeURIComponent(pageAccessToken)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Meta Page Sync Error: ${data.error?.message || "Unable to retrieve Page details."}`);
  }

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    pictureUrl: data.picture?.data?.url,
    followersCount: data.followers_count || data.fan_count || 0,
    tasks: data.tasks || [],
  };
}

/**
 * Revokes app permissions for a user on Facebook (`DELETE /{user_id}/permissions`).
 */
export async function revokeAppPermissions(userAccessToken: string, facebookUserId: string): Promise<boolean> {
  const url = `${getGraphApiBaseUrl()}/${facebookUserId}/permissions?access_token=${encodeURIComponent(userAccessToken)}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}
