/**
 * Token pricing catalog per 1M tokens (USD)
 * Standard official OpenAI pricing as of current API documentation
 */
interface ModelPricing {
  promptCostPer1M: number;
  completionCostPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o-mini": {
    promptCostPer1M: 0.15,
    completionCostPer1M: 0.60,
  },
  "gpt-4o": {
    promptCostPer1M: 2.50,
    completionCostPer1M: 10.00,
  },
  "gpt-4-turbo": {
    promptCostPer1M: 10.00,
    completionCostPer1M: 30.00,
  },
  "gpt-3.5-turbo": {
    promptCostPer1M: 0.50,
    completionCostPer1M: 1.50,
  },
};

/**
 * Estimates token cost in USD based on input (prompt) and output (completion) tokens.
 * Falls back to gpt-4o-mini rates if model is unknown.
 */
export function estimateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const normalizedModel = model.toLowerCase();
  const pricing =
    MODEL_PRICING[normalizedModel] ||
    Object.entries(MODEL_PRICING).find(([k]) => normalizedModel.includes(k))?.[1] ||
    MODEL_PRICING["gpt-4o-mini"];

  const promptCost = (inputTokens / 1_000_000) * pricing.promptCostPer1M;
  const completionCost = (outputTokens / 1_000_000) * pricing.completionCostPer1M;

  return parseFloat((promptCost + completionCost).toFixed(6));
}
