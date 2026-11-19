"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Debounced search: updates ?q= 350ms after typing stops. */
export function SearchBox({ initial }: { initial: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page");
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [value]);

  return (
    <form role="search" action={pathname} className="relative" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="q" className="sr-only">
        {t("label")}
      </label>
      <Search className="pointer-events-none absolute top-[14px] left-4 size-5 text-muted" aria-hidden />
      <input
        id="q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("placeholder")}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        className="h-12 w-full appearance-none rounded-full border border-line bg-white pr-12 pl-12 text-base outline-none focus:border-ink"
      />
      {pending && <Loader2 className="absolute top-[14px] right-4 size-5 animate-spin text-muted" aria-label={t("loading")} />}
    </form>
  );
}
