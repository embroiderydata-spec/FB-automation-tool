export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxRequestsPerMinute: number;
  maxDailyBudget: number;
  isConfigured: boolean;
}

export const OPENAI_MISSING_KEY_MESSAGE =
  "OpenAI is not configured. Add your API key in environment settings to enable AI generation.";

/**
 * Returns the centralized AI provider configuration from environment variables.
 * Keys are strictly read server-side only and never exposed to the client.
 */
export function getAIConfig(): AIProviderConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const maxRequestsPerMinute = parseInt(process.env.OPENAI_MAX_REQUESTS_PER_MINUTE || "20", 10);
  const maxDailyBudget = parseFloat(process.env.AI_MAX_DAILY_BUDGET || "10.00");

  return {
    apiKey,
    model,
    maxRequestsPerMinute: isNaN(maxRequestsPerMinute) || maxRequestsPerMinute <= 0 ? 20 : maxRequestsPerMinute,
    maxDailyBudget: isNaN(maxDailyBudget) || maxDailyBudget <= 0 ? 10.0 : maxDailyBudget,
    isConfigured: apiKey.length > 0 && !apiKey.includes("placeholder"),
  };
}
