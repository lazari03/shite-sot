import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-[22px] flex-none rounded-full md:size-[26px]", className)}
      style={{ background: "conic-gradient(var(--color-lime) 0 70%, var(--color-ink) 0)", boxShadow: "inset 0 0 0 3px var(--color-ink)" }}
    />
  );
}

export function Logo({ className, label }: { className?: string; label: string }) {
  return (
    <Link href="/" aria-label={label} className={cn("flex items-center gap-[7px] font-display text-[22px] leading-none font-extrabold tracking-[-0.045em] whitespace-nowrap md:gap-[9px] md:text-[26px]", className)}>
      <LogoMark />
      <span>
        shit<b className="font-extrabold text-lime-deep">shpejt</b>
      </span>
    </Link>
  );
}
