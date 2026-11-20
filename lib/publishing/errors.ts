/**
 * Publishing Error Classification & Retry Policy
 */

export interface ClassifiedError {
  isRecoverable: boolean;
  errorCode: string;
  userMessage: string;
  suggestedAction: string;
}

/**
 * Classifies Meta Graph API or network errors as Recoverable (transient) or Permanent.
 */
export function classifyPublishingError(err: any): ClassifiedError {
  const message = String(err?.message || err || "").toLowerCase();
  const code = err?.code || err?.status || 0;

  // Code 190: Invalid/Expired OAuth Token -> PERMANENT (user must re-auth)
  if (code === 190 || message.includes("code 190") || message.includes("session expired") || message.includes("invalid token")) {
    return {
      isRecoverable: false,
      errorCode: "META_AUTH_EXPIRED",
      userMessage: "Facebook Page access token is expired or was revoked.",
      suggestedAction: "Reconnect your Facebook account in Facebook Page Manager.",
    };
  }

  // Code 200: Missing Permissions -> PERMANENT
  if (code === 200 || message.includes("code 200") || message.includes("permission") || message.includes("pages_manage_posts")) {
    return {
      isRecoverable: false,
      errorCode: "META_MISSING_PERMISSIONS",
      userMessage: "Application lacks 'pages_manage_posts' or CREATE_CONTENT permission.",
      suggestedAction: "Grant all required permissions during Facebook OAuth login.",
    };
  }

  // Code 100: Invalid Request Parameter / Format -> PERMANENT
  if (code === 100 || message.includes("invalid parameter") || message.includes("aspect ratio") || message.includes("video format")) {
    return {
      isRecoverable: false,
      errorCode: "INVALID_VIDEO_FORMAT",
      userMessage: "Video file or parameters rejected by Facebook Reels specification.",
      suggestedAction: "Ensure the video is 9:16 vertical MP4 (1080x1920) between 3s and 90s.",
    };
  }

  // Code 4, 17, 32, 613: Rate Limits -> RECOVERABLE
  if ([4, 17, 32, 613].includes(Number(code)) || message.includes("rate limit") || message.includes("too many calls")) {
    return {
      isRecoverable: true,
      errorCode: "META_RATE_LIMIT",
      userMessage: "Meta API rate limit reached.",
      suggestedAction: "Automatic retry scheduled with exponential backoff.",
    };
  }

  // Network timeouts & 5xx server errors -> RECOVERABLE
  if (
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    code >= 500
  ) {
    return {
      isRecoverable: true,
      errorCode: "NETWORK_TIMEOUT",
      userMessage: "Temporary network connection timeout to Meta servers.",
      suggestedAction: "Automatic retry scheduled with exponential backoff.",
    };
  }

  // Default to non-recoverable if unknown to avoid infinite loops
  return {
    isRecoverable: false,
    errorCode: "UNKNOWN_PUBLISHING_ERROR",
    userMessage: err?.message || "An unexpected error occurred during publishing.",
    suggestedAction: "Check publishing logs or retry manually.",
  };
}

/**
 * Calculates exponential backoff delay in milliseconds.
 * Attempt 1: 1 minute (60,000 ms)
 * Attempt 2: 5 minutes (300,000 ms)
 * Attempt 3: 15 minutes (900,000 ms)
 */
export function calculateBackoffDelayMs(attemptNumber: number): number {
  switch (attemptNumber) {
    case 1:
      return 60 * 1000; // 1 min
    case 2:
      return 5 * 60 * 1000; // 5 min
    case 3:
      return 15 * 60 * 1000; // 15 min
    default:
      return 15 * 60 * 1000;
  }
}
