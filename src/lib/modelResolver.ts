/**
 * Centralized model resolution — picks provider-appropriate model IDs
 * based on ANTHROPIC_BASE_URL detection and env overrides.
 */

import { detectCapabilities, type LLMCapabilities } from "./llmCompat.js";

export type ModelTier = "fast" | "standard" | "premium";

const KIMI_DEFAULTS: Record<ModelTier, string> = {
  fast: "kimi-k2.5",
  standard: "kimi-k2.5",
  premium: "kimi-k2.5",
};

const TIER_ENV_KEYS: Record<ModelTier, string> = {
  fast: "AI_MODEL_FAST",
  standard: "AI_MODEL_STANDARD",
  premium: "AI_MODEL_PREMIUM",
};

/**
 * Resolve a model ID for the given tier, respecting env overrides first,
 * then falling back to provider-appropriate defaults.
 */
export function resolveModel(tier: ModelTier): string {
  const envKey = TIER_ENV_KEYS[tier];
  const envValue = process.env[envKey];
  if (envValue) return envValue;
  return KIMI_DEFAULTS[tier];
}

/** Whether the current provider supports Anthropic-style tool_choice. */
export function supportsToolUse(): boolean {
  return detectCapabilities().supportsToolUse;
}

/** Whether the current provider supports cache_control on messages. */
export function supportsCacheControl(): boolean {
  return detectCapabilities().supportsCacheControl;
}

/** Re-export for convenience. */
export { detectCapabilities, type LLMCapabilities };
