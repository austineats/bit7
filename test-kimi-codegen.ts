import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, writeFileSync } from "node:fs";

const DIAG_FILE = "kimi-codegen-diagnostic.log";
const FULL_FILE = "kimi-codegen-full-response.json";

function log(line: string) {
  const ts = new Date().toISOString();
  appendFileSync(DIAG_FILE, `[${ts}] ${line}\n`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const model = process.env.KIMI_MODEL ?? "kimi-k2.5";

  log(`API Key: ${apiKey ? `${apiKey.slice(0, 10)}...` : "MISSING"}`);
  log(`Base URL: ${baseURL ?? "undefined"}`);
  log(`Model: ${model}`);

  const systemPrompt = `You generate COMPLETE, WORKING single-file React apps rendered inside an iframe.
Output raw JSX only. No markdown fences, no explanations.`;

  const userMessage =
    "Build a modern nutrition tracker app with macro rings, recent meals, quick actions, and a functional bottom nav.";

  log("\n=== SENDING REQUEST ===");
  log(`System prompt length: ${systemPrompt.length} chars`);
  log(`User message length: ${userMessage.length} chars`);

  const client = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    maxRetries: 1,
  });

  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 3500,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const dur = Date.now() - start;

  writeFileSync(FULL_FILE, JSON.stringify(response, null, 2));

  log(`\n=== RESPONSE (${dur}ms) ===`);
  log(`stop_reason: ${response.stop_reason ?? "unknown"}`);
  log(`usage: input_tokens=${response.usage?.input_tokens ?? 0}, output_tokens=${response.usage?.output_tokens ?? 0}`);
  log(`content blocks: ${response.content.length}`);

  response.content.forEach((block, i) => {
    log(`\n--- Block ${i}: type=\"${block.type}\" ---`);
    if (block.type === "text") {
      log(`text length: ${block.text.length} chars`);
      log(`first 500 chars:\n${block.text.slice(0, 500)}`);
      log(`last 200 chars:\n${block.text.slice(-200)}`);
      if (/^\s*(const\s|function\s|ReactDOM\.render|ReactDOM\.createRoot|import\s)/.test(block.text)) {
        log("Starts with code (good)");
      }
    }
  });

  log(`\nFull response written to ${FULL_FILE}`);
}

main().catch((err) => {
  log("\n=== ERROR ===");
  log(String(err?.message ?? err));
  log(String(err?.stack ?? ""));
  process.exit(1);
});
