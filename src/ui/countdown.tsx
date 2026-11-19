"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatClock, formatRemaining, lifeFraction, msRemaining, urgencyFor } from "@/lib/time";
import { cn } from "@/lib/cn";
import { useNow } from "./clock";

type Props = {
  expiresAt: string;
  serverNow: number;
  variant?: "card" | "detail" | "inline";
  /** Refresh server data once when the deadline passes (detail pages). */
  refreshOnExpire?: boolean;
  className?: string;
};

export function Countdown({ expiresAt, serverNow, variant = "card", refreshOnExpire, className }: Props) {
  const t = useTranslations("countdown");
  const now = useNow(serverNow);
  const ms = msRemaining(expiresAt, now);
  const urgency = urgencyFor(ms);
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshOnExpire && ms === 0 && !refreshed.current && now !== serverNow) {
      refreshed.current = true;
      router.refresh();
    }
  }, [ms, now, serverNow, refreshOnExpire, router]);

  const label = ms > 0 ? t("remaining", { time: formatRemaining(ms) }) : t("expired");
  const value = ms > 0 ? (variant === "detail" ? formatClock(ms) : formatRemaining(ms)) : t("expiredShort");

  if (variant === "inline") {
    return (
      <span data-urgency={urgency} className={cn("inline-flex items-center gap-1.5", className)}>
        <Clock className="when-icon size-4 text-muted" aria-hidden />
        <span className="when-value num font-bold">{value}</span>
      </span>
    );
  }

  return (
    <div data-urgency={urgency} className={className}>
      <div className="fuse" aria-hidden>
        <i style={{ transform: `scaleX(${lifeFraction(ms)})` }} />
      </div>
      <div className={cn("flex items-center gap-1.5 text-muted", variant === "detail" ? "mt-3 text-sm" : "mt-2 text-[13px]")}>
        <Clock className={cn("when-icon flex-none", variant === "detail" ? "size-4" : "size-[15px]")} aria-hidden />
        {ms > 0 && <span className={cn(variant === "card" && "max-md:hidden")}>{t("endsIn")}</span>}
        <b
          className={cn("when-value num text-ink", variant === "detail" ? "ml-auto font-display text-2xl font-bold tracking-tight" : "font-bold")}
          role="timer"
          aria-label={label}
        >
          {value}
        </b>
      </div>
    </div>
  );
}
