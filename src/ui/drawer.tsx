"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus, Heart, LayoutDashboard, LogIn, Shield, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { LogoMark } from "./logo";

type Props = { categories: Array<{ slug: string; name: string }>; user: { name: string; isAdmin: boolean } | null; className?: string };

export function Drawer({ categories, user, className }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  const [lastPath, setLastPath] = useState(path);

  // Close on navigation (adjusting state during render, per React docs).
  if (path !== lastPath) {
    setLastPath(path);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const id = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const item = "flex min-h-[50px] w-full items-center gap-3.5 rounded-[10px] px-4 text-base font-semibold hover:bg-paper active:bg-paper-2";

  return (
    <>
      <button ref={triggerRef} type="button" className={cn("iconbtn h-14 md:h-11", className)} aria-label={t("openMenu")} aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
        <Menu className="size-5" aria-hidden />
      </button>
      <div id="drawer" className={cn("fixed inset-0 z-[60]", open ? "pointer-events-auto" : "pointer-events-none")} inert={!open}>
        <div className={cn("absolute inset-0 bg-[rgba(12,22,16,.5)] transition-opacity duration-200", open ? "opacity-100" : "opacity-0")} onClick={close} />
        <nav
          aria-label={t("menu")}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(340px,86vw)] flex-col overflow-y-auto overscroll-contain bg-white px-3 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+var(--safe-b))] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
            open ? "translate-x-0 shadow-[20px_0_60px_-20px_rgba(0,0,0,.3)]" : "-translate-x-[102%] invisible",
          )}
        >
          <div className="flex items-center justify-between pt-1 pr-1 pb-4 pl-2.5">
            <span className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.045em]">
              <LogoMark />
              <span>
                shit<b className="text-lime-deep">shpejt</b>
              </span>
            </span>
            <button ref={closeRef} type="button" className="iconbtn" aria-label={t("closeMenu")} onClick={close}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <Link className="btn btn-lime mx-1.5 mb-2 h-[52px] text-[15px]" href="/shit">
            <Plus className="size-5" aria-hidden />
            {t("sell")}
          </Link>
          <p className="mx-4 mt-4 mb-1.5 text-[13px] font-semibold text-muted">{t("categories")}</p>
          {categories.map((c) => (
            <Link key={c.slug} className={item} href={`/kategori/${c.slug}`} aria-current={path === `/kategori/${c.slug}` ? "page" : undefined}>
              {c.name}
            </Link>
          ))}
          <p className="mx-4 mt-4 mb-1.5 text-[13px] font-semibold text-muted">{t("more")}</p>
          <Link className={item} href="/ruajtura">
            <Heart className="size-5 text-muted" aria-hidden />
            {t("saved")}
          </Link>
          {user ? (
            <>
              <Link className={item} href="/paneli">
                <LayoutDashboard className="size-5 text-muted" aria-hidden />
                {t("dashboard")}
              </Link>
              <Link className={item} href="/llogaria">
                <Settings className="size-5 text-muted" aria-hidden />
                {t("settings")}
              </Link>
              {user.isAdmin && (
                <Link className={item} href="/admin">
                  <Shield className="size-5 text-muted" aria-hidden />
                  {t("admin")}
                </Link>
              )}
            </>
          ) : (
            <Link className={item} href="/hyr">
              <LogIn className="size-5 text-muted" aria-hidden />
              {t("login")}
            </Link>
          )}
          <p className="mx-4 mt-auto pt-6 text-xs leading-normal text-muted">{t("fine")}</p>
        </nav>
      </div>
    </>
  );
}
