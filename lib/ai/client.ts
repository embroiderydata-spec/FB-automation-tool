import OpenAI from "openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { getAIConfig, OPENAI_MISSING_KEY_MESSAGE } from "./config";
import { estimateTokenCost } from "./pricing";
import { checkRateLimit, checkDailyBudget } from "./rate-limiter";

export interface AIExecutionOptions {
  supabase: SupabaseClient;
  userId: string;
  pageId?: string;
  contentIdeaId?: string;
  jobType:
    | "script_generation"
    | "caption_generation"
    | "image_generation"
    | "voice_synthesis"
    | "video_render";
  systemPrompt: string;
  userPrompt: string;
  requestMetadata?: Record<string, any>;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AIExecutionResult<T = any> {
  data: T;
  rawText: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  jobId: string;
}

/**
 * Executes a server-side OpenAI chat completion request with structured JSON parsing,
 * rate limiting, budget enforcement, retry handling, and automated usage logging.
 */
export async function executeAICompletion<T = any>(
  options: AIExecutionOptions
): Promise<AIExecutionResult<T>> {
  const {
    supabase,
    userId,
    pageId,
    contentIdeaId,
    jobType,
    systemPrompt,
    userPrompt,
    requestMetadata = {},
    maxRetries = 2,
    timeoutMs = 50000,
  } = options;

  const config = getAIConfig();

  // 1. Validate configuration
  if (!config.isConfigured) {
    throw new Error(OPENAI_MISSING_KEY_MESSAGE);
  }

  // 2. Enforce requests per minute rate limit
  const rateLimitCheck = checkRateLimit(
    `ai-user-${userId}`,
    config.maxRequestsPerMinute,
    60
  );
  if (!rateLimitCheck.allowed) {
    const waitSeconds = Math.ceil(rateLimitCheck.resetMs / 1000);
    throw new Error(
      `Rate limit exceeded. Maximum ${config.maxRequestsPerMinute} generation requests per minute allowed. Please wait ${waitSeconds}s.`
    );
  }

  // 3. Enforce daily budget ceiling
  const budgetCheck = await checkDailyBudget(
    supabase,
    userId,
    config.maxDailyBudget
  );
  if (!budgetCheck.allowed) {
    throw new Error(
      `Daily AI budget of $${budgetCheck.maxBudget.toFixed(2)} reached (Current spend: $${budgetCheck.currentSpend.toFixed(2)}). Adjust AI_MAX_DAILY_BUDGET in settings to continue.`
    );
  }

  // 4. Create pending entry in ai_jobs
  const startTime = Date.now();
  let jobId = crypto.randomUUID();

  try {
    const { data: jobRow } = await supabase
      .from("ai_jobs")
      .insert({
        id: jobId,
        user_id: userId,
        facebook_page_id: pageId || null,
        content_idea_id: contentIdeaId || null,
        job_type: jobType,
        status: "processing",
        provider: "openai",
        model: config.model,
        input_params: {
          system_preview: systemPrompt.slice(0, 200),
          user_preview: userPrompt.slice(0, 200),
          ...requestMetadata,
        },
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobRow?.id) {
      jobId = jobRow.id;
    }
  } catch (err) {
    console.warn("[executeAICompletion] Could not create ai_jobs row:", err);
  }

  // 5. Instantiate OpenAI client
  const openai = new OpenAI({
    apiKey: config.apiKey,
    timeout: timeoutMs,
  });

  let lastError: any = null;
  let response: any = null;
  let attempts = 0;

  // 6. Retry loop with exponential backoff
  while (attempts <= maxRetries) {
    try {
      attempts++;
      response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.75,
      });

      // Break on success
      break;
    } catch (err: any) {
      lastError = err;
      const status = err.status || err.statusCode;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (isRetryable && attempts <= maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 6000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        break;
      }
    }
  }

  const durationMs = Date.now() - startTime;

  // 7. Handle failure
  if (!response || !response.choices || response.choices.length === 0) {
    const errorMessage =
      lastError?.message || "Failed to receive a valid completion from OpenAI.";

    try {
      await supabase
        .from("ai_jobs")
        .update({
          status: "failed",
          error_message: errorMessage,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch {
      // Ignore update error
    }

    throw new Error(errorMessage);
  }

  // 8. Parse JSON response
  const rawContent = response.choices[0].message.content || "{}";
  let parsedData: T;
  try {
    parsedData = JSON.parse(rawContent);
  } catch (parseErr) {
    throw new Error("OpenAI returned non-JSON formatted output. Please retry.");
  }

  // 9. Calculate token metrics & costs
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;
  const totalTokens = response.usage?.total_tokens || promptTokens + completionTokens;
  const costUsd = estimateTokenCost(config.model, promptTokens, completionTokens);

  // 10. Log success in ai_jobs and api_usage
  try {
    await Promise.all([
      supabase
        .from("ai_jobs")
        .update({
          status: "completed",
          output_data: { parsed: true, sample: rawContent.slice(0, 300) },
          tokens_used: totalTokens,
          cost_estimate_cents: Math.round(costUsd * 100),
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId),

      supabase.from("api_usage").insert({
        user_id: userId,
        facebook_page_id: pageId || null,
        service_name: "openai",
        endpoint: "/v1/chat/completions",
        model: config.model,
        units_consumed: totalTokens,
        unit_type: "tokens",
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
        generation_type: jobType,
        reference_id: jobId,
        metadata: {
          duration_ms: durationMs,
          content_idea_id: contentIdeaId || null,
        },
      }),
    ]);
  } catch (logErr) {
    console.warn("[executeAICompletion] Error logging usage to DB:", logErr);
  }

  return {
    data: parsedData,
    rawText: rawContent,
    model: config.model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: costUsd,
    },
    jobId,
  };
}
