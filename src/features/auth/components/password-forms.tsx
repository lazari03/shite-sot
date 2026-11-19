"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient, authErrorKey } from "../client";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/rivendos-fjalekalimin" });
    setPending(false);
    // Same response whether or not the account exists (no enumeration).
    if (error && error.status === 429) return setError("TOO_MANY_REQUESTS");
    setSent(true);
  }
  if (sent)
    return (
      <p role="status" className="rounded-[var(--radius-md)] bg-sage p-5 font-semibold text-sage-ink">
        {t("resetSent")}
      </p>
    );
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      {error && <p className="error">{t(`errors.${error}`)}</p>}
      <button className="btn btn-ink btn-lg" disabled={pending}>
        {t("sendReset")}
      </button>
    </form>
  );
}

export function ResetForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const t = useTranslations("auth");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(invalid || !token ? "INVALID_TOKEN" : null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: String(new FormData(e.currentTarget).get("password")), token });
    setPending(false);
    if (error) return setError(authErrorKey(error.code, error.status));
    setDone(true);
  }
  if (done)
    return (
      <div role="status" className="grid gap-4">
        <p className="rounded-[var(--radius-md)] bg-sage p-5 font-semibold text-sage-ink">{t("resetDone")}</p>
        <Link className="btn btn-ink btn-lg" href="/hyr">
          {t("login")}
        </Link>
      </div>
    );
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="field">
        <label htmlFor="password">{t("newPassword")}</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="input" />
      </div>
      {error && <p className="error">{t(`errors.${error}`)}</p>}
      <button className="btn btn-ink btn-lg" disabled={pending || !token}>
        {t("savePassword")}
      </button>
    </form>
  );
}
