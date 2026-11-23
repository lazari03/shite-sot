"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { toggleFavoriteAction } from "@/features/favorites/actions";
import { cn } from "@/lib/cn";

export function SaveButton({ listingId, initialSaved, loggedIn, title, variant = "overlay" }: { listingId: string; initialSaved: boolean; loggedIn: boolean; title: string; variant?: "overlay" | "square" }) {
  const t = useTranslations("listing");
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  const [error, setError] = useState(false);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!loggedIn) {
      router.push(`/hyr?next=${encodeURIComponent(pathname)}`);
      return;
    }
    start(async () => {
      setOptimistic(!saved);
      const res = await toggleFavoriteAction(listingId);
      if (res.ok) {
        setSaved(res.data.saved);
        setError(false);
        navigator.vibrate?.(8);
      } else setError(true);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={t(optimistic ? "unsave" : "save", { title })}
      title={error ? t("saveError") : undefined}
      className={cn(
        "transition-[color,transform] active:scale-90",
        variant === "overlay"
          ? "absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full bg-white/95 hover:text-clay md:top-2 md:right-2"
          : "btn btn-line h-[50px] w-[50px] flex-none px-0 md:h-[54px] md:w-[54px]",
        optimistic ? "text-clay" : "text-ink",
      )}
    >
      <Heart className="size-[19px]" fill={optimistic ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
