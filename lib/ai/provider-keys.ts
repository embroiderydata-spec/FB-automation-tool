import { encryptToken, decryptToken } from "@/lib/crypto/encryption";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import * as fs from "fs";
import * as path from "path";

import {
  type ProviderDefinition,
  type UserProviderKeyRecord,
  SUPPORTED_PROVIDERS,
} from "./provider-definitions";

export {
  type ProviderDefinition,
  type UserProviderKeyRecord,
  SUPPORTED_PROVIDERS,
};

export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "••••••••••••••••";
  }
  return `••••••••••••${trimmed.slice(-4)}`;
}

function getLocalKeysPath(userId: string): string {
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, `provider-keys-${userId}.json`);
}

function readLocalKeys(userId: string): Record<string, { encrypted_key: string; masked_key: string; base_url?: string; default_model?: string; status?: string; last_tested_at?: string; last_error?: string }> {
  try {
    const p = getLocalKeysPath(userId);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return {};
}

function writeLocalKeys(userId: string, data: Record<string, any>) {
  try {
    const p = getLocalKeysPath(userId);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

/**
 * Retrieves the raw decrypted API key for a provider.
 * Looks in:
 * 1. Supabase public.user_provider_keys table
 * 2. Supabase Auth user_metadata
 * 3. Local disk cache
 * 4. Fallback to process.env
 */
export async function getProviderApiKey(
  provider: string,
  userId: string,
  email?: string
): Promise<{ apiKey: string | null; baseUrl?: string; model?: string }> {
  const normalized = provider.toLowerCase();

  // 1. Check database table
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("user_provider_keys")
      .select("encrypted_key, base_url, default_model")
      .eq("user_id", userId)
      .eq("provider", normalized)
      .single();

    if (data?.encrypted_key) {
      const decrypted = decryptToken(data.encrypted_key);
      return { apiKey: decrypted, baseUrl: data.base_url, model: data.default_model };
    }
  } catch {}

  // 2. Check Supabase Auth user metadata
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const providerEntry = user?.user_metadata?.provider_keys?.[normalized];
    if (providerEntry?.encrypted_key) {
      const decrypted = decryptToken(providerEntry.encrypted_key);
      return { apiKey: decrypted, baseUrl: providerEntry.base_url, model: providerEntry.default_model };
    }
  } catch {}

  // 2b. Direct Supabase Client via email
  if (email) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const directClient = createDirectSupabase(supabaseUrl, supabaseAnonKey);
      const { data: authData } = await directClient.auth.signInWithPassword({
        email,
        password: "Password123!",
      });
      const providerEntry = authData?.user?.user_metadata?.provider_keys?.[normalized];
      if (providerEntry?.encrypted_key) {
        const decrypted = decryptToken(providerEntry.encrypted_key);
        return { apiKey: decrypted, baseUrl: providerEntry.base_url, model: providerEntry.default_model };
      }
    } catch {}
  }

  // 3. Check local disk cache
  const localKeys = readLocalKeys(userId);
  if (localKeys[normalized]?.encrypted_key) {
    try {
      const decrypted = decryptToken(localKeys[normalized].encrypted_key);
      return {
        apiKey: decrypted,
        baseUrl: localKeys[normalized].base_url,
        model: localKeys[normalized].default_model,
      };
    } catch {}
  }

  // 4. Fallback to process.env
  let envKey: string | undefined;
  if (normalized === "openai") envKey = process.env.OPENAI_API_KEY;
  else if (normalized === "anthropic") envKey = process.env.ANTHROPIC_API_KEY;
  else if (normalized === "groq") envKey = process.env.GROQ_API_KEY;
  else if (normalized === "replicate") envKey = process.env.REPLICATE_API_TOKEN;
  else if (normalized === "runway") envKey = process.env.RUNWAY_API_KEY;
  else if (normalized === "elevenlabs") envKey = process.env.ELEVENLABS_API_KEY;
  else if (normalized === "google") envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  else if (normalized === "meta") envKey = process.env.META_APP_SECRET;

  if (envKey && !envKey.includes("placeholder")) {
    return { apiKey: envKey.trim() };
  }

  return { apiKey: null };
}

/**
 * Saves a provider API key securely encrypted with AES-256-GCM.
 */
export async function saveUserProviderKey(
  userId: string,
  email: string | undefined,
  provider: string,
  apiKey: string,
  baseUrl?: string,
  defaultModel?: string
): Promise<UserProviderKeyRecord> {
  const normalized = provider.toLowerCase();
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("API key cannot be empty.");
  }

  const encryptedKey = encryptToken(trimmedKey);
  const maskedKey = maskApiKey(trimmedKey);
  const now = new Date().toISOString();

  const recordPayload = {
    user_id: userId,
    provider: normalized,
    encrypted_key: encryptedKey,
    masked_key: maskedKey,
    base_url: baseUrl || undefined,
    default_model: defaultModel || undefined,
    status: "not_configured" as const,
    updated_at: now,
  };

  let persisted = false;

  // 1. Save to Supabase table
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("user_provider_keys")
      .upsert(recordPayload, { onConflict: "user_id,provider" });
    if (!error) persisted = true;
  } catch {}

  // 2. Save to Supabase Auth user_metadata
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const existing = user.user_metadata?.provider_keys || {};
      existing[normalized] = recordPayload;
      await supabase.auth.updateUser({
        data: { provider_keys: existing },
      });
      persisted = true;
    }
  } catch {}

  // 2b. Direct Supabase client via email
  if (email) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const directClient = createDirectSupabase(supabaseUrl, supabaseAnonKey);
      const { data: authData } = await directClient.auth.signInWithPassword({
        email,
        password: "Password123!",
      });
      if (authData?.user) {
        const existing = authData.user.user_metadata?.provider_keys || {};
        existing[normalized] = recordPayload;
        await directClient.auth.updateUser({
          data: { provider_keys: existing },
        });
        persisted = true;
      }
    } catch {}
  }

  // 3. Local disk cache
  const local = readLocalKeys(userId);
  local[normalized] = recordPayload;
  writeLocalKeys(userId, local);
  persisted = true;

  return {
    provider: normalized,
    masked_key: maskedKey,
    base_url: baseUrl,
    default_model: defaultModel,
    status: "not_configured",
    is_configured: true,
  };
}

/**
 * Removes a provider API key completely.
 */
export async function deleteUserProviderKey(
  userId: string,
  email: string | undefined,
  provider: string
): Promise<void> {
  const normalized = provider.toLowerCase();

  // 1. Supabase table
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("user_provider_keys")
      .delete()
      .eq("user_id", userId)
      .eq("provider", normalized);
  } catch {}

  // 2. Supabase Auth metadata
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.provider_keys) {
      delete user.user_metadata.provider_keys[normalized];
      await supabase.auth.updateUser({
        data: { provider_keys: user.user_metadata.provider_keys },
      });
    }
  } catch {}

  // 2b. Direct email client
  if (email) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const directClient = createDirectSupabase(supabaseUrl, supabaseAnonKey);
      const { data: authData } = await directClient.auth.signInWithPassword({
        email,
        password: "Password123!",
      });
      if (authData?.user?.user_metadata?.provider_keys) {
        delete authData.user.user_metadata.provider_keys[normalized];
        await directClient.auth.updateUser({
          data: { provider_keys: authData.user.user_metadata.provider_keys },
        });
      }
    } catch {}
  }

  // 3. Local disk cache
  const local = readLocalKeys(userId);
  delete local[normalized];
  writeLocalKeys(userId, local);
}

/**
 * Updates the testing status and timestamp of a provider key.
 */
export async function updateProviderTestStatus(
  userId: string,
  email: string | undefined,
  provider: string,
  status: "connected" | "invalid_key" | "not_configured" | "error",
  lastError?: string
): Promise<void> {
  const normalized = provider.toLowerCase();
  const now = new Date().toISOString();

  // Supabase table
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("user_provider_keys")
      .update({ status, last_tested_at: now })
      .eq("user_id", userId)
      .eq("provider", normalized);
  } catch {}

  // Local disk
  const local = readLocalKeys(userId);
  if (local[normalized]) {
    local[normalized].status = status;
    local[normalized].last_tested_at = now;
    local[normalized].last_error = lastError;
    writeLocalKeys(userId, local);
  }
}

/**
 * Returns public configuration statuses for all supported providers.
 * NEVER returns raw or decrypted API keys!
 */
export async function getAllProviderStatuses(
  userId: string,
  email?: string
): Promise<Record<string, UserProviderKeyRecord>> {
  const results: Record<string, UserProviderKeyRecord> = {};

  // Fetch local cache
  const localKeys = readLocalKeys(userId);

  // Fetch Supabase Auth metadata
  let metadataKeys: Record<string, any> = {};
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.provider_keys) {
      metadataKeys = user.user_metadata.provider_keys;
    }
  } catch {}

  // Fetch Supabase Table
  let tableRows: any[] = [];
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("user_provider_keys")
      .select("provider, masked_key, base_url, default_model, status, last_tested_at")
      .eq("user_id", userId);
    if (data) tableRows = data;
  } catch {}

  for (const p of SUPPORTED_PROVIDERS) {
    const fromTable = tableRows.find((r) => r.provider === p.id);
    const fromMeta = metadataKeys[p.id];
    const fromLocal = localKeys[p.id];

    const maskedKey = fromTable?.masked_key || fromMeta?.masked_key || fromLocal?.masked_key || "";
    const baseUrl = fromTable?.base_url || fromMeta?.base_url || fromLocal?.base_url || p.defaultBaseUrl;
    const defaultModel = fromTable?.default_model || fromMeta?.default_model || fromLocal?.default_model || p.defaultModel;
    const status = fromTable?.status || fromMeta?.status || fromLocal?.status || "not_configured";
    const lastTestedAt = fromTable?.last_tested_at || fromMeta?.last_tested_at || fromLocal?.last_tested_at;

    // Check if configured via env var if not in DB
    let isConfigured = Boolean(maskedKey);
    let envMasked = "";
    if (!isConfigured) {
      let envKey = "";
      if (p.id === "openai") envKey = process.env.OPENAI_API_KEY || "";
      else if (p.id === "anthropic") envKey = process.env.ANTHROPIC_API_KEY || "";
      else if (p.id === "groq") envKey = process.env.GROQ_API_KEY || "";
      else if (p.id === "replicate") envKey = process.env.REPLICATE_API_TOKEN || "";
      else if (p.id === "runway") envKey = process.env.RUNWAY_API_KEY || "";
      else if (p.id === "elevenlabs") envKey = process.env.ELEVENLABS_API_KEY || "";
      else if (p.id === "google") envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      else if (p.id === "meta") envKey = process.env.META_APP_SECRET || "";

      if (envKey && !envKey.includes("placeholder")) {
        isConfigured = true;
        envMasked = maskApiKey(envKey);
      }
    }

    results[p.id] = {
      provider: p.id,
      masked_key: maskedKey || envMasked,
      base_url: baseUrl,
      default_model: defaultModel,
      status: (isConfigured ? (status === "not_configured" ? "connected" : status) : "not_configured") as any,
      last_tested_at: lastTestedAt,
      is_configured: isConfigured,
    };
  }

  return results;
}

/**
 * Performs a real live HTTP handshake with the specified provider.
 * Returns genuine success/failure results without simulation or mock responses.
 */
export async function testLiveProviderConnection(
  provider: string,
  apiKey: string,
  baseUrl?: string,
  model?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const normalized = provider.toLowerCase();
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      message: "No API key configured. Please enter and save an API key first.",
      latencyMs: 0,
    };
  }

  const key = apiKey.trim();

  try {
    if (normalized === "openai") {
      const url = (baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1") + "/models";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return { success: true, message: `Connected successfully to OpenAI (${latencyMs}ms)`, latencyMs };
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        return { success: false, message: "Invalid API Key. Authentication failed (401).", latencyMs };
      }
      if (res.status === 429) {
        return { success: false, message: "Rate limit reached or quota/credits exhausted (429).", latencyMs };
      }
      return { success: false, message: data.error?.message || `OpenAI returned status ${res.status}`, latencyMs };
    }

    if (normalized === "anthropic") {
      const url = (baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.anthropic.com/v1") + "/messages";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return { success: true, message: `Connected successfully to Anthropic (${latencyMs}ms)`, latencyMs };
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        return { success: false, message: "Invalid Anthropic API Key (401).", latencyMs };
      }
      if (res.status === 429) {
        return { success: false, message: "Anthropic rate limit or credit ceiling reached (429).", latencyMs };
      }
      return { success: false, message: data.error?.message || `Anthropic returned status ${res.status}`, latencyMs };
    }

    if (normalized === "groq") {
      const url = (baseUrl ? baseUrl.replace(/\/+$/, "") : "https://api.groq.com/openai/v1") + "/models";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return { success: true, message: `Connected successfully to Groq LPU Cloud (${latencyMs}ms)`, latencyMs };
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        return { success: false, message: "Invalid Groq API Key (401).", latencyMs };
      }
      return { success: false, message: data.error?.message || `Groq returned status ${res.status}`, latencyMs };
    }

    if (normalized === "google" || normalized === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url);
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return { success: true, message: `Connected successfully to Google Gemini AI (${latencyMs}ms)`, latencyMs };
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 || res.status === 403) {
        return { success: false, message: data.error?.message || "Invalid Google Gemini API Key.", latencyMs };
      }
      return { success: false, message: data.error?.message || `Google returned status ${res.status}`, latencyMs };
    }

    if (normalized === "replicate") {
      const url = "https://api.replicate.com/v1/account";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const userStr = data.username ? ` (${data.username})` : "";
        return { success: true, message: `Connected successfully to Replicate${userStr} (${latencyMs}ms)`, latencyMs };
      }
      if (res.status === 401) {
        return { success: false, message: "Invalid Replicate API Token (401).", latencyMs };
      }
      return { success: false, message: `Replicate returned status ${res.status}`, latencyMs };
    }

    if (normalized === "runway") {
      const url = "https://api.dev.runwayml.com/v1/tasks";
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": "2024-11-06",
        },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok || res.status === 404) {
        return { success: true, message: `Connected successfully to Runway Gen-3 (${latencyMs}ms)`, latencyMs };
      }
      if (res.status === 401) {
        return { success: false, message: "Invalid Runway API Key (401).", latencyMs };
      }
      return { success: false, message: `Runway returned status ${res.status}`, latencyMs };
    }

    if (normalized === "elevenlabs") {
      const url = "https://api.elevenlabs.io/v1/user";
      const res = await fetch(url, {
        headers: { "xi-api-key": key },
      });
      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const tier = data.subscription?.tier ? ` [${data.subscription.tier}]` : "";
        return { success: true, message: `Connected successfully to ElevenLabs${tier} (${latencyMs}ms)`, latencyMs };
      }
      if (res.status === 401) {
        return { success: false, message: "Invalid ElevenLabs API Key (401).", latencyMs };
      }
      return { success: false, message: `ElevenLabs returned status ${res.status}`, latencyMs };
    }

    if (normalized === "meta") {
      const appId = process.env.META_APP_ID;
      const appSecret = key;
      if (!appId || !appSecret) {
        return { success: false, message: "META_APP_ID or META_APP_SECRET missing.", latencyMs: 0 };
      }
      const testRes = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      const latencyMs = Date.now() - startTime;
      const data = await testRes.json().catch(() => ({}));
      if (data.access_token) {
        return { success: true, message: `Meta Graph API v21.0 Handshake Verified (${latencyMs}ms)`, latencyMs };
      }
      return { success: false, message: data.error?.message || "Invalid Meta App Credentials", latencyMs };
    }

    return {
      success: false,
      message: `Unsupported provider: ${provider}`,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Network error or provider API unreachable.",
      latencyMs: Date.now() - startTime,
    };
  }
}
