import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHead({ id, title, subtitle, href, linkLabel, children }: { id?: string; title: string; subtitle?: string; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="mt-5 mb-1.5 flex scroll-mt-4 flex-wrap items-end justify-between gap-x-4 gap-y-1.5 md:mt-8">
      <div>
        <h2 id={id ? `${id}-title` : undefined} className="h-display text-[26px] md:mb-2 md:text-[clamp(28px,3.4vw,42px)]">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted md:text-[15px]">{subtitle}</p>}
      </div>
      {children}
      {href && linkLabel && (
        <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold hover:underline">
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="empty col-span-full">
      <h3 className="mb-1.5 font-display text-[22px] font-bold tracking-tight">{title}</h3>
      {body && <p className="mb-[18px] text-muted">{body}</p>}
      {action}
    </div>
  );
}
