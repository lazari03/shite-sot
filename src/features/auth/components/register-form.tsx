"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient, authErrorKey, safeNext } from "../client";

export function RegisterForm({ next, google }: { next?: string; google: boolean }) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const target = safeNext(next);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("terms") !== "on") return setError("TERMS");
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(fd.get("name")).trim(),
      email: String(fd.get("email")).trim(),
      password: String(fd.get("password")),
      callbackURL: target,
    });
    setPending(false);
    if (error) return setError(authErrorKey(error.code, error.status));
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="rounded-[var(--radius-md)] bg-sage p-5 text-sage-ink">
        <p className="font-bold">{t("checkEmailTitle")}</p>
        <p className="mt-1 text-sm">{t("checkEmailBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {google && (
        <>
          <button type="button" className="btn btn-line btn-lg w-full" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: target })}>
            {t("google")}
          </button>
          <p className="text-center text-xs font-semibold text-muted">{t("or")}</p>
        </>
      )}
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="field">
          <label htmlFor="name">{t("name")}</label>
          <input id="name" name="name" required minLength={2} maxLength={40} autoComplete="name" className="input" />
        </div>
        <div className="field">
          <label htmlFor="email">{t("email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div className="field">
          <label htmlFor="password">{t("password")}</label>
          <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="input" aria-describedby="pw-hint" />
          <p id="pw-hint" className="hint">
            {t("passwordHint")}
          </p>
        </div>
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>{t("terms")}</span>
        </label>
        {error && (
          <p role="alert" className="error">
            {t(`errors.${error}`)}
          </p>
        )}
        <button type="submit" className="btn btn-ink btn-lg w-full" disabled={pending}>
          {t("register")}
        </button>
      </form>
    </div>
  );
}
