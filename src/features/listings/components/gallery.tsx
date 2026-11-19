"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { cn } from "@/lib/cn";

type Img = { src: string; srcLarge: string; width: number; height: number };

/** Scroll-snap gallery (swipe on mobile) + thumbnails on desktop. No library. */
export function Gallery({ images, title, badge }: { images: Img[]; title: string; badge?: React.ReactNode }) {
  const t = useTranslations("listing");
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (!images.length) {
    return (
      <div className="grid aspect-square place-items-center bg-placeholder text-muted-2 max-md:-mx-4 md:aspect-[4/3] md:rounded-[var(--radius-lg)]">
        <Camera className="size-10" aria-hidden />
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-md:-mx-4">
        <div
          ref={track}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto bg-placeholder [scrollbar-width:none] md:aspect-[4/3] md:rounded-[var(--radius-lg)] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-roledescription={t("gallery")}
          aria-label={title}
        >
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- pre-optimised variants
            <img
              key={img.src}
              src={img.srcLarge}
              srcSet={`${img.src} 640w, ${img.srcLarge} 1280w`}
              sizes="(max-width: 864px) 100vw, 55vw"
              width={img.width}
              height={img.height}
              alt={t("photoAlt", { title, n: i + 1, total: images.length })}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              className="size-full flex-none snap-start object-cover"
            />
          ))}
        </div>
        {badge}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {images.map((img, i) => (
              <span key={img.src} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 max-md:hidden">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => go(i)}
              aria-label={t("showPhoto", { n: i + 1 })}
              aria-current={i === index}
              className={cn("size-16 overflow-hidden rounded-[var(--radius-sm)] border-2", i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
              <img src={img.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
