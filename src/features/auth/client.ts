"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/paneli"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function authErrorKey(code: string | undefined, status?: number): string {
  if (status === 429) return "TOO_MANY_REQUESTS";
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "EMAIL_NOT_VERIFIED":
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
    case "INVALID_TOKEN":
    case "INVALID_EMAIL":
    case "USER_ALREADY_EXISTS":
      return code;
    default:
      return "GENERIC";
  }
}
