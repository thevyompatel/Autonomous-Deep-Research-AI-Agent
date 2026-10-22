import type { z } from "zod";
import type {
  critiqueSchema,
  decisionReasonSchema,
  doneEventSchema,
  errorEventSchema,
  finalizerEventSchema,
  heartbeatEventSchema,
  noticeEventSchema,
  plannerEventSchema,
  reflectorEventSchema,
  reportDetailSchema,
  reportListItemSchema,
  reportMetaSchema,
  runSummarySchema,
  searcherEventSchema,
  sourceSchema,
  startEventSchema,
  statusSchema,
  stoppedEventSchema,
  synthesizerEventSchema,
  usageSchema,
} from "@/api/schemas";

export type Usage = z.infer<typeof usageSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Critique = z.infer<typeof critiqueSchema>;
export type DecisionReason = z.infer<typeof decisionReasonSchema>;

export type StartEvent = z.infer<typeof startEventSchema>;
export type PlannerEvent = z.infer<typeof plannerEventSchema>;
export type SearcherEvent = z.infer<typeof searcherEventSchema>;
export type SynthesizerEvent = z.infer<typeof synthesizerEventSchema>;
export type ReflectorEvent = z.infer<typeof reflectorEventSchema>;
export type FinalizerEvent = z.infer<typeof finalizerEventSchema>;
export type NodeEvent =
  | PlannerEvent
  | SearcherEvent
  | SynthesizerEvent
  | ReflectorEvent
  | FinalizerEvent;
export type NodeName = NodeEvent["node"];
export type NoticeEvent = z.infer<typeof noticeEventSchema>;
export type DoneEvent = z.infer<typeof doneEventSchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
export type StoppedEvent = z.infer<typeof stoppedEventSchema>;
export type HeartbeatEvent = z.infer<typeof heartbeatEventSchema>;

/** Every numbered event the server can send for a research job. */
export type RunEvent =
  | StartEvent
  | NodeEvent
  | NoticeEvent
  | DoneEvent
  | ErrorEvent
  | StoppedEvent;

export type RunSummary = z.infer<typeof runSummarySchema>;
export type Status = z.infer<typeof statusSchema>;
export type ReportListItem = z.infer<typeof reportListItemSchema>;
export type ReportMeta = z.infer<typeof reportMetaSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;

export const TERMINAL_EVENTS = ["done", "error", "stopped"] as const;
