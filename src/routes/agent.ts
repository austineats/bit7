import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { orchestrateChatInstruction, orchestrateInputSchema } from "../lib/chatOrchestrator.js";

export const agentRouter = Router();

const orchestratorRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  validate: false,
  message: { message: "Too many orchestration requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

agentRouter.post("/orchestrate", orchestratorRateLimiter, async (req, res) => {
  try {
    const body = orchestrateInputSchema.parse(req.body);
    const result = await orchestrateChatInstruction(body);
    return res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Invalid request", issues: error.issues });
    }
    console.error("Orchestrator error:", error);
    return res.status(500).json({ message: "Orchestrator failed" });
  }
});
