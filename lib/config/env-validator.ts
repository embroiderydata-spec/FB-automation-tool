/**
 * Production Environment Configuration & Startup Validator
 * Audits environment variables without leaking secret contents.
 */

export interface EnvValidationReport {
  environment: "development" | "staging" | "production";
  isValid: boolean;
  blockers: string[];
  warnings: string[];
  services: {
    supabase: boolean;
    meta: boolean;
    openai: boolean;
    videoProvider: string;
    tokenEncryption: boolean;
  };
}

export function validateEnvironment(): EnvValidationReport {
  const env = (process.env.APP_ENV || process.env.NODE_ENV || "development") as
    | "development"
    | "staging"
    | "production";

  const isProd = env === "production";
  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Supabase Core Validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasSupabaseUrl = Boolean(supabaseUrl && !supabaseUrl.includes("placeholder-project"));
  const hasSupabaseAnon = Boolean(supabaseAnonKey && !supabaseAnonKey.includes("placeholder-anon-key"));
  const hasSupabaseService = Boolean(supabaseServiceKey && !supabaseServiceKey.includes("placeholder"));

  if (!hasSupabaseUrl) {
    if (isProd) blockers.push("NEXT_PUBLIC_SUPABASE_URL is missing or using placeholder.");
    else warnings.push("NEXT_PUBLIC_SUPABASE_URL is not explicitly set; using default.");
  }
  if (!hasSupabaseAnon) {
    if (isProd) blockers.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder.");
    else warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not explicitly set; using default.");
  }
  if (!hasSupabaseService) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY is required for background workers and admin actions.");
  }

  // 2. Token Encryption Key Validation
  const encKey = process.env.TOKEN_ENCRYPTION_KEY;
  let hasValidEncryption = false;
  if (!encKey) {
    warnings.push("TOKEN_ENCRYPTION_KEY not set; using internal default fallback.");
    hasValidEncryption = true;
  } else if (/^[0-9a-fA-F]{64}$/.test(encKey) || encKey.length === 32) {
    hasValidEncryption = true;
  } else {
    blockers.push("TOKEN_ENCRYPTION_KEY must be a 64-hex character string or 32-byte string.");
  }

  // 3. Meta Facebook OAuth Validation
  const metaAppId = process.env.META_APP_ID;
  const metaAppSecret = process.env.META_APP_SECRET;
  const hasMeta = Boolean(metaAppId && metaAppSecret && !metaAppId.includes("your_meta"));
  if (!hasMeta) {
    warnings.push("Meta Facebook App credentials (META_APP_ID, META_APP_SECRET) are unconfigured. OAuth will operate in demo/mock mode.");
  }

  // 4. OpenAI Provider Validation
  const openaiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = Boolean(openaiKey && openaiKey.startsWith("sk-"));
  if (!hasOpenAI) {
    warnings.push("OPENAI_API_KEY is not configured. AI Content Engine will produce simulated templates.");
  }

  // 5. Video Provider Validation
  const videoProvider = process.env.VIDEO_PROVIDER || "mock";
  if (videoProvider === "replicate" && !process.env.REPLICATE_API_TOKEN) {
    warnings.push("VIDEO_PROVIDER is set to replicate, but REPLICATE_API_TOKEN is missing.");
  }

  return {
    environment: env,
    isValid: blockers.length === 0,
    blockers,
    warnings,
    services: {
      supabase: hasSupabaseUrl && hasSupabaseAnon,
      meta: hasMeta,
      openai: hasOpenAI,
      videoProvider,
      tokenEncryption: hasValidEncryption,
    },
  };
}
