export const HOUR_MS = 3_600_000;
export const LISTING_LIFETIME_MS = 48 * HOUR_MS;
/** Below this the countdown switches to the urgent style. */
export const URGENT_THRESHOLD_MS = 6 * HOUR_MS;
export const TIMEZONE = "Europe/Tirane";

export function computeExpiresAt(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + LISTING_LIFETIME_MS);
}

export function msRemaining(expiresAt: Date | string | number, now: number): number {
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

export type Urgency = "calm" | "soon" | "urgent" | "expired";

export function urgencyFor(ms: number): Urgency {
  if (ms <= 0) return "expired";
  if (ms < HOUR_MS) return "urgent";
  if (ms < URGENT_THRESHOLD_MS) return "soon";
  return "calm";
}

/** "36h 20m", "12h 05m", "58m", "45s". Coarse, so it's stable across the SSR → hydration boundary. */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${Math.ceil(ms / 1000)}s`;
}

/** "11:42:07" for the hero clock. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

export function lifeFraction(ms: number): number {
  return Math.min(1, Math.max(0, ms / LISTING_LIFETIME_MS));
}

export function formatDate(d: Date | string, locale = "sq-AL"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TIMEZONE, day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string, locale = "sq-AL"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}
