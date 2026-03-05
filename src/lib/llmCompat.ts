/**
 * LLM compatibility layer — adapts Anthropic API parameters
 * for non-Anthropic providers (e.g., Kimi K2 via moonshot.ai).
 */

export interface LLMCapabilities {
  supportsToolUse: boolean;
  supportsCacheControl: boolean;
  provider: "anthropic" | "kimi" | "unknown";
}

let _cached: LLMCapabilities | null = null;

export function detectCapabilities(): LLMCapabilities {
  if (_cached) return _cached;

  const baseURL = process.env.ANTHROPIC_BASE_URL ?? "";

  if (!baseURL || baseURL.includes("anthropic.com")) {
    _cached = { supportsToolUse: true, supportsCacheControl: true, provider: "anthropic" };
  } else if (baseURL.includes("moonshot.ai") || baseURL.includes("kimi")) {
    _cached = { supportsToolUse: false, supportsCacheControl: false, provider: "kimi" };
  } else {
    _cached = { supportsToolUse: false, supportsCacheControl: false, provider: "unknown" };
  }

  return _cached;
}

/**
 * Structured telemetry log for every LLM call site.
 * feature: reasoner | research | design | content | codegen | repair | chat | clarify | intentClassifier
 */
export function llmLog(feature: string, extras?: Record<string, unknown>): void {
  const caps = detectCapabilities();
  const mode = caps.supportsToolUse ? "tool" : "json";
  const parts = [`[LLM] provider=${caps.provider}, mode=${mode}, feature=${feature}`];
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      parts.push(`${k}=${String(v)}`);
    }
  }
  console.log(parts.join(", "));
}

/**
 * Strip thinking-model tags from text responses.
 * Kimi K2.5 and other thinking models emit <think>...</think> blocks
 * that contain internal reasoning — not the actual output. If these
 * aren't stripped, extractJSON/cleanGeneratedCode will parse the
 * thinking content instead of the real answer.
 */
export function stripThinkingContent(text: string): string {
  // Remove <think>...</think> blocks (greedy — handle multiple blocks)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Also handle unclosed <think> (model hit token limit mid-thought)
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, "");
  return cleaned.trim();
}

/**
 * Extract usable text from an Anthropic SDK response content array.
 * Handles thinking models by filtering out thinking blocks and
 * stripping any residual <think> tags from text blocks.
 */
export function extractTextFromResponse(
  content: Array<{ type: string; text?: string; thinking?: string }>,
): string {
  const textParts: string[] = [];
  for (const block of content) {
    // Skip thinking content blocks (Anthropic SDK parses these for thinking models)
    if (block.type === "thinking") continue;
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
    }
  }
  // Strip any residual <think> tags that might appear inline in text blocks
  return stripThinkingContent(textParts.join("\n")).trim();
}

/** Extract JSON from a text response (handles markdown code blocks and thinking tags). */
export function extractJSON(text: string): string {
  // First strip thinking content so we don't parse JSON from the model's internal reasoning
  const cleaned = stripThinkingContent(text);
  const fenced = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenced) {
    const candidate = fenced[1].trim();
    // Validate it's actual JSON before returning
    try { JSON.parse(candidate); return candidate; } catch { /* not valid JSON, continue */ }
  }
  // Try to find a raw JSON object — validate with JSON.parse to avoid matching JSX braces
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { JSON.parse(objMatch[0]); return objMatch[0].trim(); } catch { /* not valid JSON */ }
  }
  return cleaned.trim();
}

/**
 * Extract code content from markdown fences in a text response.
 * Returns the fenced code content, or null if no code fences found.
 */
export function extractCodeFromFences(text: string): string | null {
  const cleaned = stripThinkingContent(text);
  // Match ```jsx, ```tsx, ```javascript, ```js, or bare ``` code blocks
  const fenced = cleaned.match(/```(?:jsx?|tsx?|javascript)?\s*\n([\s\S]*?)\n```/);
  if (fenced && fenced[1].trim().length > 50) {
    return fenced[1].trim();
  }
  return null;
}
