import "server-only";
import { z } from "zod";
import { AppError, type ActionResult } from "./errors";
import { log } from "./logger";

/** Map Zod issues to { field: messageKey }. Schemas use i18n keys as messages. */
export function zodFieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", "VALIDATION", zodFieldErrors(r.error));
  return r.data;
}

/**
 * Wrap a server action body: never leak raw errors to the client.
 * Next.js control-flow errors (redirect/notFound) are re-thrown.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data } as ActionResult<T>;
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    if (e instanceof AppError) return { ok: false, code: e.code, messageKey: e.messageKey, fieldErrors: e.fieldErrors };
    log.error("action failed", { err: e });
    return { ok: false, code: "INTERNAL", messageKey: "INTERNAL" };
  }
}

function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}
