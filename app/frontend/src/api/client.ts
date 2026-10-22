import { z, type ZodType } from "zod";
import {
  reportDetailSchema,
  reportListItemSchema,
  statusSchema,
} from "@/api/schemas";
import type { ReportDetail, ReportListItem, Status } from "@/api/types";

/** An HTTP or network failure. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Turn a non-OK response into an ApiError carrying the server's JSON body. */
export async function errorFrom(response: Response): Promise<ApiError> {
  const body = asRecord(await response.json().catch(() => null));
  const message = typeof body.error === "string" ? body.error : `Server error ${response.status}`;
  return new ApiError(message, response.status, body);
}

export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError("The research server is unreachable.", 0);
  }
}

async function getJson<T>(path: string, schema: ZodType<T, z.ZodTypeDef, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await request(path, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw await errorFrom(response);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new ApiError("The server sent an unexpected response.", response.status);
  return parsed.data;
}

export const api = {
  status: (signal?: AbortSignal): Promise<Status> => getJson("/api/status", statusSchema, signal),

  reports: (signal?: AbortSignal): Promise<ReportListItem[]> =>
    getJson("/api/reports", z.array(reportListItemSchema), signal),

  report: (name: string, signal?: AbortSignal): Promise<ReportDetail> =>
    getJson(`/api/reports/${encodeURIComponent(name)}`, reportDetailSchema, signal),

  async stop(runId: string): Promise<void> {
    const response = await request(`/api/runs/${encodeURIComponent(runId)}/stop`, { method: "POST" });
    if (!response.ok && response.status !== 409) throw await errorFrom(response);
  },

  /** Best-effort stop while the page is unloading (fetch would be cancelled). */
  stopBeacon(runId: string): void {
    navigator.sendBeacon?.(`/api/runs/${encodeURIComponent(runId)}/stop`);
  },

  rawReportUrl: (name: string): string => `/api/reports/${encodeURIComponent(name)}/raw`,
};
