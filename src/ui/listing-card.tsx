import { MapPin, Camera } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ListingCard as Card } from "@/features/listings/queries";
import { cn } from "@/lib/cn";
import { Countdown } from "./countdown";
import { Price } from "./price";
import { SaveButton } from "./save-button";

export function ListingCard({ item, serverNow, saved, loggedIn, priority }: { item: Card; serverNow: number; saved?: boolean; loggedIn: boolean; priority?: boolean }) {
  const t = useTranslations();
  const expired = item.status !== "ACTIVE";
  return (
    <article className={cn("card", expired && "is-expired")}>
      <Link className="card-link" href={`/p/${item.slug}`} aria-label={item.title}>
        <div className="relative aspect-[4/3] overflow-hidden bg-placeholder">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- variants are pre-optimised WebP from our storage
            <img
              src={item.imageUrl}
              srcSet={item.imageUrlLarge ? `${item.imageUrl} 640w, ${item.imageUrlLarge} 1280w` : undefined}
              sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
              alt=""
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-2">
              <Camera className="size-8" aria-hidden />
            </div>
          )}
          {item.promoted && <span className="tag tag-ink max-w-[calc(100%_-_64px)] truncate">{t("listing.sponsored")}</span>}
          {!item.promoted && item.status === "SOLD" && <span className="tag tag-ink max-w-[calc(100%_-_64px)] truncate">{t("status.SOLD")}</span>}
          {!item.promoted && item.status === "ACTIVE" && item.condition === "NEW" && <span className="tag max-w-[calc(100%_-_64px)] truncate">{t("condition.NEW")}</span>}
        </div>
        <div className="flex-1 px-[11px] pt-2.5 md:px-4 md:pt-3.5">
          <h3 className="line-clamp-2 text-sm leading-[1.35] font-semibold wrap-anywhere md:text-[15px]">{item.title}</h3>
          <div className="mt-2">
            <Price minor={item.priceMinor} currency={item.currency} className="text-[clamp(17px,5vw,21px)] wrap-anywhere md:text-[25px]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {item.city}
            </span>
            <span className="max-md:hidden">{t(`condition.${item.condition}`)}</span>
          </div>
        </div>
        <div className="px-[11px] pt-2.5 pb-3 md:px-4 md:pt-3.5 md:pb-4">
          {item.expiresAt && item.status === "ACTIVE" ? (
            <Countdown expiresAt={item.expiresAt} serverNow={serverNow} />
          ) : (
            <p className="text-[13px] font-semibold text-muted">{t(`status.${item.status}`)}</p>
          )}
        </div>
      </Link>
      <SaveButton listingId={item.id} initialSaved={Boolean(saved)} loggedIn={loggedIn} title={item.title} variant="overlay" />
    </article>
  );
}

export function CardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-2 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4", className)}>{children}</div>;
}
