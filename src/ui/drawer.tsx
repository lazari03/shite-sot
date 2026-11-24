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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [lastPath, setLastPath] = useState(path);

  // Close on navigation (adjusting state during render, per React docs).
  if (path !== lastPath) {
    setLastPath(path);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const item = "flex min-h-11 w-full items-center gap-3.5 rounded-[10px] px-4 text-base font-semibold hover:bg-paper active:bg-paper-2";

  return (
    <>
      <button type="button" className={cn("iconbtn", className)} aria-label={t("openMenu")} aria-expanded={open} aria-controls="drawer" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Menu className="size-5" aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        id="drawer"
        aria-label={t("menu")}
        className="menu-dialog"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <nav className="menu-panel">
          <div className="flex items-center justify-between pt-1 pr-1 pb-4 pl-2.5">
            <span className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.045em]">
              <LogoMark />
              <span>
                shit<b className="text-lime-deep">shpejt</b>
              </span>
            </span>
            <button type="button" className="iconbtn" aria-label={t("closeMenu")} onClick={() => setOpen(false)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <Link className="btn btn-lime mx-1.5 mb-2" href="/shit">
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
      </dialog>
    </>
  );
}
