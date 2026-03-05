import Anthropic from "@anthropic-ai/sdk";
import { recordSpend, calculateCost } from "../../costTracker.js";

export type IntentClass = "build_new" | "modify_existing" | "ambiguous" | "out_of_scope";

export interface ClassifiedIntent {
  classification: IntentClass;
  confidence: number;
  constraints: string[];     // explicit constraints extracted from prompt (e.g., "dark mode", "mobile-first", "3 pages")
  refined_prompt?: string;   // clarified version if ambiguous
  rejection_reason?: string; // if out_of_scope, why
}

const CLASSIFIER_SYSTEM = `You are a prompt classifier for an AI app builder. Given a user prompt, classify it and extract constraints.

Respond with JSON only:
{
  "classification": "build_new" | "modify_existing" | "ambiguous" | "out_of_scope",
  "confidence": 0.0-1.0,
  "constraints": ["constraint1", "constraint2"],
  "refined_prompt": "optional clarified version",
  "rejection_reason": "only if out_of_scope"
}

Classification rules:
- "build_new": User wants to create a new app. Clear enough to proceed. Examples: "Build a recipe manager", "Create a fitness tracker for runners"
- "modify_existing": User references an existing app or wants changes. Examples: "Add dark mode to my app", "Change the color scheme", "Make the buttons bigger"
- "ambiguous": Too vague to build anything useful. Examples: "make an app", "something cool", just a single word
- "out_of_scope": Not an app request at all. Examples: "What's the weather?", "Tell me a joke", "Write an essay about dogs"

Constraints: Extract explicit design/feature requirements from the prompt:
- Theme: "dark mode", "light theme", "vibrant colors"
- Layout: "mobile-first", "sidebar layout", "dashboard style"
- Pages: "3 pages", "single page", "with settings page"
- Features: "with notifications", "real-time updates", "drag and drop"
- Style: "minimalist", "modern", "retro", "glassmorphism"

Be lenient — if the prompt mentions ANY app concept, classify as "build_new" even if brief.
Only use "ambiguous" for truly meaningless prompts (1-2 generic words).
Only use "out_of_scope" for clearly non-app requests.`;

export async function classifyIntent(prompt: string): Promise<ClassifiedIntent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No API key — assume build_new
    return { classification: "build_new", confidence: 0.5, constraints: [] };
  }

  const modelId = process.env.AI_MODEL_FAST || "claude-haiku-4-5-20251001";
  const client = new Anthropic({
    apiKey,
    maxRetries: 0,
    ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
  });

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 300,
      temperature: 0,
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const usage = response.usage as unknown as Record<string, number>;
    const cost = calculateCost(modelId, { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    recordSpend(cost);

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const parsed = JSON.parse(text) as ClassifiedIntent;
    return parsed;
  } catch (e) {
    console.warn("Intent classification failed, defaulting to build_new:", e);
    return { classification: "build_new", confidence: 0.5, constraints: [] };
  }
}
