import { Router } from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/db.js";
import { z } from "zod";

export const chatRouter = Router();

const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => `chat:${String((req.params as Record<string, string>)["id"] ?? "")}`,
  validate: false,
  message: { message: "Too many AI requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatRequestSchema = z.object({
  system: z.string().min(1).max(4000),
  message: z.string().min(1).max(10000),
});

chatRouter.post("/:id/chat", chatRateLimiter, async (req, res) => {
  const id = String(req.params["id"]);

  const app = await prisma.app.findUnique({ where: { id } });
  if (!app) return res.status(404).json({ message: "App not found" });

  let body: z.infer<typeof chatRequestSchema>;
  try {
    body = chatRequestSchema.parse(req.body);
  } catch {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "AI service unavailable" });

  const client = new Anthropic({ apiKey, maxRetries: 0, ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}) });
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: process.env.AI_MODEL_FAST || "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: body.system,
      messages: [{ role: "user", content: body.message }],
    });

    const duration_ms = Date.now() - startTime;
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    const tokens_used = response.usage.input_tokens + response.usage.output_tokens;

    // Log the run
    await prisma.appRun.create({
      data: {
        app_id: id,
        inputs: { system: body.system.slice(0, 500), message: body.message.slice(0, 500) },
        output: { text: text.slice(0, 2000) },
        tokens_used,
        duration_ms,
      },
    });

    // Increment run count
    await prisma.app.update({
      where: { id },
      data: { run_count: { increment: 1 } },
    });

    return res.json({ text, tokens_used, duration_ms });
  } catch (e) {
    console.error("Chat AI error:", e);
    return res.status(502).json({ message: "AI request failed. Please try again." });
  }
});
