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
    <div className="flex flex-col gap-3.5 rounded-[var(--radius-md)] bg-ink-2 p-4 md:gap-[18px] md:p-[26px]">
      <div className="flex justify-between gap-3 text-sm text-[#a9b8ab]">
        <span className="inline-flex items-center gap-2">
          <i className="size-2 animate-pulse rounded-full bg-clay motion-reduce:animate-none" aria-hidden />
          {t("endsFirst")}
        </span>
        <span>{item.city}</span>
      </div>
      <div className="font-display text-[52px] leading-[.9] font-bold tracking-[-0.04em] whitespace-nowrap text-lime tabular-nums md:text-[clamp(54px,7.2vw,108px)]" role="timer" aria-label={t("timeLeft")}>
        {h}
        <span className="text-[#4f6656]">:</span>
        {m}
        <span className="text-[#4f6656]">:</span>
        {s}
      </div>
      <div className="fuse h-1.5 bg-white/10" aria-hidden>
        <i className="bg-lime" style={{ transform: `scaleX(${lifeFraction(ms)})` }} />
      </div>
      <Link href={`/p/${item.slug}`} className="grid grid-cols-[52px_1fr_auto] items-center gap-3.5 rounded-[9px] bg-white py-2 pr-3 pl-2 text-ink transition-transform hover:-translate-y-0.5 md:grid-cols-[64px_1fr_auto] md:py-2.5 md:pr-4 md:pl-2.5">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-optimised variant
          <img src={item.imageUrl} alt="" className="size-[52px] rounded-md object-cover md:size-16" />
        ) : (
          <span className="size-[52px] rounded-md bg-placeholder md:size-16" />
        )}
        <span className="min-w-0">
          <b className="block truncate leading-[1.3] font-semibold">{item.title}</b>
          <small className="text-muted">{item.condition}</small>
        </span>
        <strong className="price text-[19px] md:text-[22px]">{item.price}</strong>
      </Link>
    </div>
  );
}
