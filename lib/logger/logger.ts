/**
 * Production Structured Logger with Automatic Secret Redaction
 * Ensures tokens, passwords, and private keys are never exposed in log streams.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  service?: string;
  jobId?: string;
  userId?: string;
  pageId?: string;
  errorCode?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    code?: string;
    stack?: string;
  };
}

// Regex patterns to detect and redact sensitive credentials
const SENSITIVE_PATTERNS = [
  /EAA[0-9A-Za-z]+/g,                          // Meta Facebook User/Page Access Tokens
  /sk-[a-zA-Z0-9_\-]{20,}/g,                   // OpenAI Secret Keys
  /sb_secret_[a-zA-Z0-9_\-]{20,}/g,             // Supabase Service Role Keys
  /sb_publishable_[a-zA-Z0-9_\-]{20,}/g,        // Supabase Publishable Keys
  /r8_[a-zA-Z0-9]{20,}/g,                      // Replicate API Tokens
  /xi-[a-zA-Z0-9]{20,}/g,                      // ElevenLabs API Keys
  /(token|password|secret|auth|key)["']?\s*[:=]\s*["']?([^"',\s]+)/gi, // JSON or key-value secrets
];

/**
 * Deeply sanitizes any string or object, replacing discovered secrets with [REDACTED].
 */
export function redactSecrets(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match, p1, p2) => {
        if (p1 && p2) {
          return `${p1}="[REDACTED]"`;
        }
        return "[REDACTED]";
      });
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }

  if (typeof data === "object") {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("key") ||
        lowerKey.includes("authorization")
      ) {
        cleanObj[key] = "[REDACTED]";
      } else {
        cleanObj[key] = redactSecrets(val);
      }
    }
    return cleanObj;
  }

  return data;
}

/**
 * Emits a structured log line.
 */
function log(level: LogLevel, service: string, message: string, context?: LogContext, error?: any) {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message: redactSecrets(message),
    context: context ? redactSecrets(context) : undefined,
  };

  if (error) {
    entry.error = {
      name: error?.name || "Error",
      message: redactSecrets(error?.message || String(error)),
      code: error?.code,
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    };
  }

  const jsonString = JSON.stringify(entry);

  if (level === "error") {
    console.error(jsonString);
  } else if (level === "warn") {
    console.warn(jsonString);
  } else if (level === "debug") {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV !== "production") {
      console.debug(jsonString);
    }
  } else {
    console.log(jsonString);
  }

  return entry;
}

export const logger = {
  info: (service: string, message: string, context?: LogContext) =>
    log("info", service, message, context),

  warn: (service: string, message: string, context?: LogContext, error?: any) =>
    log("warn", service, message, context, error),

  error: (service: string, message: string, context?: LogContext, error?: any) =>
    log("error", service, message, context, error),

  debug: (service: string, message: string, context?: LogContext) =>
    log("debug", service, message, context),
};
