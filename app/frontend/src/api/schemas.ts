/**
 * Runtime schemas for everything app/web.py sends. Events arrive as
 * newline-delimited JSON; each is validated here before it reaches the store.
 */
import { z } from "zod";

export const usageSchema = z.object({ used: z.number(), cap: z.number() });

export const sourceSchema = z.object({
  n: z.number().int(),
  title: z.string(),
  url: z.string(),
  domain: z.string(),
  snippet: z.string().default(""),
  // Older servers did not send these; treat their sources as scraped.
  scraped: z.boolean().default(true),
  query: z.string().default(""),
});

export const critiqueSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  missing: z.array(z.string()),
  follow_up_queries: z.array(z.string()),
});

export const decisionReasonSchema = z.enum([
  "passed",
  "max_iterations",
  "token_cap",
  "no_follow_ups",
  "retry",
]);

const numbered = { seq: z.number().int().positive(), t: z.number() };

const nodeBase = {
  ...numbered,
  type: z.literal("node"),
  summary: z.string(),
  tokens: z.number(),
  source_count: z.number(),
  usage: usageSchema.optional(),
};

export const startEventSchema = z.object({
  ...numbered,
  type: z.literal("start"),
  run_id: z.string(),
  question: z.string(),
  model: z.string(),
  started_at: z.number(),
  max_iterations: z.number(),
  pass_score: z.number(),
  max_tokens: z.number().optional(),
  usage: usageSchema.optional(),
});

export const plannerEventSchema = z.object({
  ...nodeBase,
  node: z.literal("planner"),
  sub_queries: z.array(z.string()),
});

export const searcherEventSchema = z.object({
  ...nodeBase,
  node: z.literal("searcher"),
  round: z.number(),
  queries: z.array(z.string()),
  sources: z.array(sourceSchema),
});

export const synthesizerEventSchema = z.object({
  ...nodeBase,
  node: z.literal("synthesizer"),
  draft_number: z.number(),
  words: z.number(),
  draft: z.string(),
});

export const reflectorEventSchema = z.object({
  ...nodeBase,
  node: z.literal("reflector"),
  critique: critiqueSchema,
  iteration: z.number(),
  next: z.enum(["searcher", "finalizer"]),
  reason: decisionReasonSchema,
});

export const finalizerEventSchema = z.object({
  ...nodeBase,
  node: z.literal("finalizer"),
  name: z.string(),
});

export const nodeEventSchema = z.discriminatedUnion("node", [
  plannerEventSchema,
  searcherEventSchema,
  synthesizerEventSchema,
  reflectorEventSchema,
  finalizerEventSchema,
]);

export const noticeEventSchema = z.object({
  ...numbered,
  type: z.literal("notice"),
  kind: z.string(),
  message: z.string(),
  seconds: z.number().optional(),
  reason: z.string().optional(),
});

export const doneEventSchema = z.object({
  ...numbered,
  type: z.literal("done"),
  name: z.string(),
  title: z.string(),
  markdown: z.string(),
  seconds: z.number(),
  tokens: z.number(),
  iterations: z.number(),
  final_score: z.number().nullable(),
  first_draft: z.string().nullable(),
  usage: usageSchema.optional(),
});

export const errorEventSchema = z.object({
  ...numbered,
  type: z.literal("error"),
  kind: z.string(),
  message: z.string(),
  usage: usageSchema.optional(),
});

export const stoppedEventSchema = z.object({
  ...numbered,
  type: z.literal("stopped"),
  reason: z.string(),
});

export const heartbeatEventSchema = z.object({ type: z.literal("heartbeat") });

export const runSummarySchema = z.object({
  id: z.string(),
  question: z.string(),
  status: z.enum(["running", "stopping", "done", "error", "stopped"]),
  started_at: z.number(),
  last_seq: z.number(),
});

export const statusSchema = z.object({
  model: z.string(),
  missing_keys: z.array(z.string()),
  usage: usageSchema,
  requests_per_minute: z.number(),
  max_iterations: z.number(),
  pass_score: z.number(),
  max_tokens: z.number().optional(),
  busy: z.boolean(),
  run: runSummarySchema.nullable().default(null),
});

export const reportListItemSchema = z.object({
  name: z.string(),
  title: z.string(),
  modified: z.string(),
  words: z.number(),
  revised: z.boolean().default(false),
  question: z.string().nullable().optional(),
  final_score: z.number().nullable().optional(),
  iterations: z.number().nullable().optional(),
});

export const reportMetaSchema = z.object({
  question: z.string().optional(),
  model: z.string().optional(),
  created: z.string().optional(),
  seconds: z.number().optional(),
  tokens: z.number().optional(),
  iterations: z.number().optional(),
  final_score: z.number().nullable().optional(),
  passed: z.boolean().nullable().optional(),
  sources: z.array(sourceSchema).optional(),
});

export const reportDetailSchema = z.object({
  name: z.string(),
  title: z.string(),
  markdown: z.string(),
  modified: z.string(),
  words: z.number(),
  first_draft: z.string().nullable(),
  meta: reportMetaSchema.nullable().optional(),
});
