import { env } from "@/env";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /pass(word)?|secret|token|authorization|cookie|whatsapp|phone|email/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1)]),
  );
}

function write(level: Level, msg: string, ctx?: Record<string, unknown>) {
  let min: Level = "info";
  try {
    min = env().LOG_LEVEL;
  } catch {
    /* env not loaded yet */
  }
  if (ORDER[level] < ORDER[min]) return;
  const line = { level, time: new Date().toISOString(), msg, ...(ctx ? (redact(ctx) as object) : {}) };
  const out = process.env.NODE_ENV === "production" ? JSON.stringify(line) : `[${level}] ${msg}${ctx ? " " + JSON.stringify(redact(ctx)) : ""}`;
  if (level === "error" || level === "warn") console.error(out);
  else console.log(out);
}

export const log = {
  debug: (m: string, c?: Record<string, unknown>) => write("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => write("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => write("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => write("error", m, c),
};
