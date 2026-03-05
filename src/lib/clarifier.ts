import Anthropic from "@anthropic-ai/sdk";
import { recordSpend } from "./costTracker.js";

export interface ClarifyResult {
  clear: boolean;
  refined_prompt?: string;
  questions?: Array<{
    question: string;
    options: string[];
  }>;
}

const SYSTEM_PROMPT = `You are a product scope analyst for an app builder platform. Your job is to determine whether a user's prompt is specific enough to build a high-quality app, or if it's too vague and needs clarification.

A prompt is CLEAR ENOUGH if it implies:
- A specific domain or use case (e.g. "calorie tracker", "project management tool for freelancers")
- Enough context to determine key features and layout

A prompt is TOO VAGUE if:
- It's extremely short and generic (e.g. "make an app", "something cool", "fitness")
- It names a broad category with no specifics (e.g. "social media app", "e-commerce")
- It's ambiguous what the user actually wants

When a prompt IS clear enough, respond with:
{ "clear": true }

When a prompt is TOO VAGUE, respond with 2-3 focused questions (each with 3-4 concrete options) that will narrow it down. Questions should be practical and specific. Options should be real, concrete choices — not generic.

Example for "fitness app":
{
  "clear": false,
  "questions": [
    { "question": "What type of fitness app?", "options": ["Workout tracker", "Meal planner", "Running coach", "Gym routine builder"] },
    { "question": "Who is it for?", "options": ["Beginners", "Gym regulars", "Athletes", "Personal trainers"] }
  ]
}

Example for "build me something":
{
  "clear": false,
  "questions": [
    { "question": "What category?", "options": ["Productivity tool", "Health & fitness", "Finance tracker", "Creative tool"] },
    { "question": "What's the main thing it should do?", "options": ["Track & organize data", "Generate content", "Analyze & score things", "Plan & schedule"] }
  ]
}

IMPORTANT:
- Be aggressive about asking — if there's any ambiguity, ask.
- Keep questions SHORT (under 10 words each).
- Keep options SHORT (2-4 words each).
- Max 3 questions, min 2.
- Always respond with valid JSON only. No markdown, no explanation.`;

export async function clarifyPrompt(prompt: string): Promise<ClarifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No API key — just pass through
    return { clear: true };
  }

  const client = new Anthropic({ apiKey, maxRetries: 0, ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}) });

  try {
    const response = await client.messages.create({
      model: process.env.AI_MODEL_FAST || "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Track cost (Haiku is very cheap)
    const usage = response.usage;
    const cost = ((usage.input_tokens * 0.80 + usage.output_tokens * 4.0) / 1_000_000);
    recordSpend(cost);

    const parsed = JSON.parse(text) as ClarifyResult;
    return parsed;
  } catch (e) {
    console.warn("Clarification failed, treating as clear:", e);
    return { clear: true };
  }
}
