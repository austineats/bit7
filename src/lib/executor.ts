import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db.js";
import type { AppSpec, RunResult } from "../types/index.js";

function sanitizeInput(value: string, maxLength = 10000): string {
  return value.replace(/\u0000/g, "").slice(0, maxLength);
}

function renderContextTemplate(template: string, inputs: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return inputs[key] !== undefined ? sanitizeInput(inputs[key]) : `{{${key}}}`;
  });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function executeApp(
  appId: string,
  spec: AppSpec,
  inputs: Record<string, string>,
  navId?: string,
): Promise<RunResult> {
  // Find the target screen (default to first screen)
  const screen = spec.screens.find((s) => s.nav_id === navId) ?? spec.screens[0];

  // Validate required inputs for this screen
  for (const field of screen.input_fields) {
    if (field.required && !inputs[field.key]?.trim()) {
      throw Object.assign(new Error(`Missing required input: ${field.label}`), { status: 400 });
    }
    if (field.max_length && inputs[field.key] && inputs[field.key].length > field.max_length) {
      throw Object.assign(
        new Error(`Input "${field.label}" exceeds maximum length of ${field.max_length} characters`),
        { status: 400 }
      );
    }
  }

  const renderedContext = renderContextTemplate(screen.ai_logic.context_template, inputs);

  // Token budget check
  const estimatedTokens =
    estimateTokens(screen.ai_logic.system_prompt) + estimateTokens(renderedContext);
  if (estimatedTokens > 6000) {
    throw Object.assign(new Error("Inputs too large. Please reduce the length of your inputs."), {
      status: 400,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const startTime = Date.now();

  let outputText: string;
  let tokensUsed: number;

  if (!apiKey) {
    // Mock mode: return a stub response for local dev without an API key
    const fieldSummary = Object.entries(inputs)
      .map(([k, v]) => `**${k}:** ${v}`)
      .join("\n\n");
    outputText = `**[Mock Mode — No API Key]**\n\nThis is a placeholder response. Add \`ANTHROPIC_API_KEY\` to your \`.env\` to get real AI output.\n\n---\n\n${fieldSummary}`;
    tokensUsed = 0;
  } else {
    const client = new Anthropic({ apiKey, maxRetries: 0, ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}) });

    const response = await client.messages.create({
      model: process.env.AI_MODEL_FAST || "claude-haiku-4-5-20251001",
      max_tokens: Math.min(screen.ai_logic.max_tokens, 2000),
      temperature: Math.min(screen.ai_logic.temperature, 0.9),
      system: screen.ai_logic.system_prompt,
      messages: [{ role: "user", content: renderedContext }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    outputText = textBlock?.type === "text" ? textBlock.text : "";
    tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  }

  const durationMs = Date.now() - startTime;

  const run = await prisma.appRun.create({
    data: {
      app_id: appId,
      inputs: inputs as object,
      output: { text: outputText, format: screen.output_format } as object,
      tokens_used: tokensUsed,
      duration_ms: durationMs,
    },
  });

  await prisma.app.update({
    where: { id: appId },
    data: { run_count: { increment: 1 } },
  });

  return {
    run_id: run.id,
    output: { text: outputText, format: screen.output_format },
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  };
}
