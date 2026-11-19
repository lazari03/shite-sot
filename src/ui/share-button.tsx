"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export function ShareButton({ title, url, className }: { title: string; url: string; className?: string }) {
  const t = useTranslations("listing");
  const [copied, setCopied] = useState(false);
  async function onClick() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn("btn btn-line h-[50px] w-[50px] flex-none px-0 md:h-[54px] md:w-[54px]", className)} aria-label={copied ? t("linkCopied") : t("share")}>
      {copied ? <Check className="size-5 text-lime-deep" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {copied ? t("linkCopied") : ""}
      </span>
    </button>
  );
}
