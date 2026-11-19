/** Domain error with a stable code and an i18n message key (namespace "errors"). */
export class AppError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION"
      | "RATE_LIMITED"
      | "CONFLICT"
      | "INVALID_STATE"
      | "BANNED",
    public readonly messageKey: string = code,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(`${code}: ${messageKey}`);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; code: AppError["code"] | "INTERNAL"; messageKey: string; fieldErrors?: Record<string, string> };
