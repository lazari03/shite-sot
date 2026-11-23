"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatClock, lifeFraction, msRemaining } from "@/lib/time";
import { useNow } from "./clock";

type Item = { slug: string; title: string; city: string; expiresAt: string; imageUrl: string | null; price: string; condition: string };

/** Big lime clock for the listing that ends first. Real data only. */
export function HeroClock({ item, serverNow }: { item: Item; serverNow: number }) {
  const t = useTranslations("home");
  const now = useNow(serverNow);
  const ms = msRemaining(item.expiresAt, now);
  const [h, m, s] = formatClock(ms).split(":");
  return (
    <div className="flex flex-col min-w-0 gap-2.5 rounded-[var(--radius-md)] bg-ink-2 p-3.5 md:gap-3 md:p-5">
      <div className="flex justify-between gap-3 text-sm text-[#a9b8ab]">
        <span className="inline-flex items-center gap-2">
          <i className="size-2 animate-pulse rounded-full bg-clay motion-reduce:animate-none" aria-hidden />
          {t("endsFirst")}
        </span>
        <span>{item.city}</span>
      </div>
      <div className="font-display text-[clamp(32px,12vw,52px)] leading-[.9] font-bold tracking-[-0.04em] whitespace-nowrap text-lime tabular-nums md:text-[clamp(48px,6.4vw,86px)]" role="timer" aria-label={t("timeLeft")}>
        {h}
        <span className="text-[#4f6656]">:</span>
        {m}
        <span className="text-[#4f6656]">:</span>
        {s}
      </div>
      <div className="fuse h-1.5 bg-white/10" aria-hidden>
        <i className="bg-lime" style={{ transform: `scaleX(${lifeFraction(ms)})` }} />
      </div>
      <Link href={`/p/${item.slug}`} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-[9px] bg-white py-2 pr-3 pl-2 text-ink transition-transform hover:-translate-y-0.5 md:grid-cols-[52px_minmax(0,1fr)_minmax(0,38%)] md:py-2.5 md:pr-4 md:pl-2.5">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-optimised variant
          <img src={item.imageUrl} alt="" className="size-11 rounded-md object-cover md:size-[52px]" />
        ) : (
          <span className="size-11 rounded-md bg-placeholder md:size-[52px]" />
        )}
        <span className="min-w-0">
          <b className="block truncate leading-[1.3] font-semibold">{item.title}</b>
          <small className="text-muted">{item.condition}</small>
        </span>
        <strong className="price col-start-2 text-[19px] wrap-anywhere md:col-start-auto md:text-right md:text-[22px]">{item.price}</strong>
      </Link>
    </div>
  );
}
