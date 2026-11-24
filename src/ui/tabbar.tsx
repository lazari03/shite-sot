"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Heart, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export function TabBar({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("nav");
  const path = usePathname();
  const tabs = [
    { href: "/", label: t("home"), icon: Home, active: path === "/" },
    { href: "/kerko", label: t("search"), icon: Search, active: path.startsWith("/kerko") || path.startsWith("/kategori") },
    { href: "/shit", label: t("sellShort"), icon: Plus, active: path.startsWith("/shit"), sell: true },
    { href: "/ruajtura", label: t("saved"), icon: Heart, active: path.startsWith("/ruajtura") },
    { href: loggedIn ? "/paneli" : "/hyr", label: loggedIn ? t("account") : t("login"), icon: User, active: path.startsWith("/paneli") || path.startsWith("/llogaria") || path.startsWith("/hyr") },
  ];
  return (
    <nav
      aria-label={t("main")}
      className="glass grid h-[calc(var(--tabbar)+var(--safe-b))] grid-cols-5 border-t border-line bg-white/95 px-1.5 pb-[var(--safe-b)] backdrop-blur-[14px] backdrop-saturate-[1.4] md:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, active, sell }) => (
        <Link
          key={href + label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn("flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] leading-tight font-semibold", active || sell ? "text-ink" : "text-muted")}
        >
          <span className={cn("grid place-items-center transition-transform active:scale-90", sell && "h-[30px] w-12 rounded-[11px] bg-lime")}>
            <Icon className="size-[23px]" fill={active && !sell ? "currentColor" : "none"} strokeWidth={sell ? 2.4 : 2} aria-hidden />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
