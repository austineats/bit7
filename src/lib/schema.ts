import { z } from "zod";

export const inputFieldSchema = z.object({
  key: z.string().regex(/^[a-z_][a-z0-9_]*$/).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(["text", "textarea", "select", "number"]),
  placeholder: z.string().max(500).optional(),
  options: z.array(z.string().max(100)).max(20).optional(),
  required: z.boolean(),
  max_length: z.number().int().min(1).max(10000).optional(),
});

export const aiLogicSchema = z.object({
  system_prompt: z.string().min(10).max(3000),
  context_template: z.string().min(5).max(3000),
  temperature: z.number().min(0).max(1.0),
  max_tokens: z.number().int().min(50).max(2000),
});

export const screenSchema = z.object({
  nav_id: z.string().regex(/^[a-z_]+$/).max(30),
  layout: z.enum(["tool", "analyzer", "generator", "dashboard", "planner"]),
  hero: z.object({
    title: z.string().min(1).max(80),
    subtitle: z.string().min(1).max(200),
    cta_label: z.string().min(1).max(40),
  }),
  input_fields: z.array(inputFieldSchema).min(1).max(6),
  ai_logic: aiLogicSchema,
  output_format: z.enum(["markdown", "cards", "grid_cards", "score_card", "report", "list", "plain", "dashboard"]),
  output_label: z.string().min(1).max(60),
});

export const appSpecSchema = z.object({
  schema_version: z.literal("2"),
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  theme: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    style: z.enum(["light", "dark", "vibrant"]),
    icon: z.string().min(1).max(30),
  }),
  navigation: z.array(
    z.object({
      id: z.string().regex(/^[a-z_]+$/).max(30),
      label: z.string().min(1).max(30),
      icon: z.string().min(1).max(30),
    })
  ).min(2).max(6),
  screens: z.array(screenSchema).min(2).max(6),
});

export const generateRequestSchema = z.object({
  prompt: z.string().min(10).max(4000),
});

export const runAppRequestSchema = z.object({
  nav_id: z.string().optional(),
  inputs: z.record(z.string(), z.string().max(10000)),
});

export type AppSpecInput = z.infer<typeof appSpecSchema>;
export type RunAppInput = z.infer<typeof runAppRequestSchema>;
