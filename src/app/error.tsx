"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="wrap py-16 text-center">
      <h1 className="h-display text-[34px]">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("body")}</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-muted">ref: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn btn-ink mt-6">
        {t("retry")}
      </button>
    </div>
  );
}
