"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient, authErrorKey, safeNext } from "../client";

export function LoginForm({ next, google }: { next?: string; google: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const target = safeNext(next);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password: String(fd.get("password")), callbackURL: target });
    setPending(false);
    if (error) {
      const key = authErrorKey(error.code, error.status);
      setError(key);
      if (key === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email);
      return;
    }
    router.replace(target);
    router.refresh();
  }

  async function resend() {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: target });
    setResent(true);
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
      <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
        <div className="field">
          <label htmlFor="email">{t("email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div className="field">
          <label htmlFor="password">{t("password")}</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {error && (
          <p role="alert" className="error">
            {t(`errors.${error}`)}
          </p>
        )}
        {unverifiedEmail && (
          <button type="button" className="btn btn-line" onClick={resend} disabled={resent}>
            {resent ? t("verificationSent") : t("resendVerification")}
          </button>
        )}
        <button type="submit" className="btn btn-ink btn-lg w-full" disabled={pending}>
          {t("login")}
        </button>
      </form>
      <Link href="/harrova-fjalekalimin" className="text-center text-sm font-semibold text-muted hover:text-ink">
        {t("forgot")}
      </Link>
    </div>
  );
}
