import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { withTimeout } from "./llmTimeout.js";
import { resolveModel } from "./modelResolver.js";
import { extractJSON, extractTextFromResponse, llmLog } from "./llmCompat.js";

export const orchestrateInputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  has_app: z.boolean().default(false),
  workbench_mode: z.enum(["build", "visual_edit", "discuss"]).optional(),
});

export type OrchestrateInput = z.infer<typeof orchestrateInputSchema>;

const orchestrateOutputSchema = z.object({
  action: z.enum(["generate", "refine", "discuss"]),
  optimized_text: z.string().min(1).max(4000),
  assistant_message: z.string().min(1).max(800),
  suggested_mode: z.enum(["build", "visual_edit", "discuss"]).optional(),
});

export type OrchestrateResult = z.infer<typeof orchestrateOutputSchema>;

const ORCHESTRATOR_SYSTEM = `You are the StartBox chat orchestration agent.
Decide whether the user message should:
- generate a new app
- refine the current app
- answer as discuss/advice

Rules:
1. If has_app=false, action should be "generate".
2. If has_app=true, action should usually be "refine" or "discuss" (not "generate").
3. NEVER ask clarifying questions. Make the best first-pass assumption and proceed.
4. Rewrite the user text into optimized_text that is specific, concise, and implementation-ready.
5. assistant_message should be short and useful (one sentence).
6. suggested_mode:
   - visual styling/layout request -> visual_edit
   - strategy/question request -> discuss
   - feature/logic request -> build
Respond with a single JSON object only.`;

function isVaguePrompt(prompt: string): boolean {
  const p = prompt.trim().toLowerCase();
  if (p.length < 12) return true;
  if (/^(build|make|create)\s+(an?\s+)?app\b[.!?]*$/.test(p)) return true;
  if (/^(something|anything)\b/.test(p)) return true;
  if (/^improve it\b[.!?]*$/.test(p)) return true;
  return false;
}

function expandPromptForFirstPass(prompt: string): string {
  const base = prompt.trim();
  const lower = base.toLowerCase();
  const alreadyDetailed = /feature|page|screen|layout|dashboard|workflow|auth|settings|profile|responsive|mobile/.test(lower);
  if (alreadyDetailed || base.length > 120) return base;
  return [
    base,
    "",
    "Execution requirements:",
    "- Deliver a complete, production-style app on first pass.",
    "- Include 2-4 pages/tabs with clear navigation and domain-specific copy.",
    "- Ensure the first screen is immediately useful with working interactions.",
    "- Use realistic sample data and avoid generic filler sections.",
    "- Keep spacing, control alignment, and responsiveness polished.",
  ].join("\n");
}

function isDiscussIntent(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /\b(why|how|should|strategy|tradeoff|compare|pros|cons|roadmap|plan)\b/.test(p) && !/\b(add|build|implement|change|refactor|fix)\b/.test(p);
}

function isVisualIntent(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /\b(ui|layout|spacing|typography|font|color|theme|visual|style|animation|padding|margin)\b/.test(p);
}

function normalizeForState(input: OrchestrateInput, result: OrchestrateResult): OrchestrateResult {
  let action = result.action;
  let suggested_mode = result.suggested_mode;

  if (!input.has_app && action !== "generate") {
    action = "generate";
    suggested_mode = undefined;
  }
  if (input.has_app && action === "generate") {
    action = "refine";
  }

  return {
    action,
    optimized_text: result.optimized_text || (input.has_app ? input.prompt : expandPromptForFirstPass(input.prompt)),
    assistant_message: result.assistant_message || "Using an optimized instruction.",
    suggested_mode,
  };
}

function fallbackOrchestrate(input: OrchestrateInput): OrchestrateResult {
  if (!input.has_app) {
    return {
      action: "generate",
      optimized_text: expandPromptForFirstPass(input.prompt),
      assistant_message: isVaguePrompt(input.prompt)
        ? "Using best-fit assumptions to build a complete first version."
        : "Generating from your prompt with an optimized execution plan.",
    };
  }

  if (input.workbench_mode === "discuss" || isDiscussIntent(input.prompt)) {
    return {
      action: "discuss",
      optimized_text: input.prompt,
      assistant_message: "I’ll answer this as a product/design discussion.",
      suggested_mode: "discuss",
    };
  }

  if (isVisualIntent(input.prompt)) {
    return {
      action: "refine",
      optimized_text: input.prompt,
      assistant_message: "Applying this as a visual refinement.",
      suggested_mode: "visual_edit",
    };
  }

  return {
    action: "refine",
    optimized_text: input.prompt,
    assistant_message: "Applying this as a build refinement.",
    suggested_mode: "build",
  };
}

function deterministicFastOrchestrate(input: OrchestrateInput): OrchestrateResult {
  return fallbackOrchestrate(input);
}

export async function orchestrateChatInstruction(input: OrchestrateInput): Promise<OrchestrateResult> {
  // Fast path: keep orchestration local/deterministic unless explicitly enabled.
  if (process.env.STARTBOX_ORCHESTRATOR_USE_LLM !== "true") {
    return deterministicFastOrchestrate(input);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackOrchestrate(input);

  try {
    const client = new Anthropic({
      apiKey,
      maxRetries: 2,
      ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
    });

    const modelId = resolveModel("fast");
    llmLog("chatOrchestrator", { model: modelId, has_app: input.has_app, mode: input.workbench_mode ?? "none" });

    const response = await withTimeout(
      (signal) => client.messages.create({
        model: modelId,
        max_tokens: 1200,
        temperature: 0.2,
        system: ORCHESTRATOR_SYSTEM,
        messages: [{
          role: "user",
          content: [
            `has_app: ${input.has_app}`,
            `workbench_mode: ${input.workbench_mode ?? "none"}`,
            `user_prompt: ${input.prompt}`,
            "",
            "Return JSON with fields:",
            "- action: generate|refine|discuss",
            "- optimized_text",
            "- assistant_message",
            "- suggested_mode (build|visual_edit|discuss, optional)",
          ].join("\n"),
        }],
      }, { signal }),
      Number(process.env.STARTBOX_ORCHESTRATOR_TIMEOUT_MS ?? 30000),
      "Chat orchestrator",
    );

    const text = extractTextFromResponse(
      response.content as Array<{ type: string; text?: string; thinking?: string }>,
    );
    if (!text) return fallbackOrchestrate(input);

    const parsed = orchestrateOutputSchema.safeParse(JSON.parse(extractJSON(text)));
    if (!parsed.success) {
      return fallbackOrchestrate(input);
    }

    return normalizeForState(input, parsed.data);
  } catch {
    return fallbackOrchestrate(input);
  }
}
