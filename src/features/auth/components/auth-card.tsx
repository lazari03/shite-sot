import Link from "next/link";
import { LogoMark } from "@/ui/logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-display text-2xl font-extrabold tracking-[-0.045em]" aria-label="ShitShpejt">
        <LogoMark />
        <span>
          shit<b className="text-lime-deep">shpejt</b>
        </span>
      </Link>
      <div className="panel w-full max-w-[440px]">
        <h1 className="h-display text-[30px]">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-sm text-muted">{footer}</div>}
    </div>
  );
}
