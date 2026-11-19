"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_UPLOAD_BYTES } from "@/features/media/images";
import { MAX_IMAGES } from "../schema";
import { cn } from "@/lib/cn";

export type UploadedImage = { id: string; url: string };

/** Uploads each photo immediately (server re-encodes + strips EXIF), keeps order for the form. */
export function ImageUploader({ value, onChange, invalid }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void; invalid?: boolean }) {
  const t = useTranslations("sell");
  const te = useTranslations("errors");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_IMAGES - latest.current.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(te("images_max"));
    for (const file of list) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(te("upload_too_large"));
        continue;
      }
      setBusy((b) => b + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const json = (await res.json()) as { ok: boolean; id?: string; url?: string; messageKey?: string };
        if (json.ok && json.id && json.url) {
          const next = [...latest.current, { id: json.id, url: json.url }];
          latest.current = next;
          onChange(next);
        } else setError(te(json.messageKey ?? "upload_failed"));
      } catch {
        setError(te("upload_failed"));
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }
  function moveFirst(i: number) {
    const next = [...value];
    const [item] = next.splice(i, 1);
    if (item) next.unshift(item);
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((img, i) => (
          <div key={img.id} className="relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-line bg-placeholder">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded preview */}
            <img src={img.url} alt={t("photoN", { n: i + 1 })} className="size-full object-cover" />
            {i === 0 && <span className="tag left-1.5 top-1.5 text-[11px]">{t("cover")}</span>}
            <div className="absolute right-1 bottom-1 flex gap-1">
              {i > 0 && (
                <button type="button" onClick={() => moveFirst(i)} className="grid size-8 place-items-center rounded-full bg-white/95" aria-label={t("makeCover")}>
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              )}
              <button type="button" onClick={() => remove(img.id)} className="grid size-8 place-items-center rounded-full bg-white/95 text-clay" aria-label={t("removePhoto", { n: i + 1 })}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy${i}`} className="grid aspect-square place-items-center rounded-[var(--radius-sm)] border border-line bg-paper">
            <Loader2 className="size-6 animate-spin text-muted" aria-label={t("uploading")} />
          </div>
        ))}
        {value.length + busy < MAX_IMAGES && (
          <label
            className={cn(
              "relative grid cursor-pointer place-content-center justify-items-center gap-1 rounded-[var(--radius-md)] border-[1.5px] border-dashed bg-paper p-2 text-center text-muted transition-colors hover:border-ink focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-lime-deep",
              value.length === 0 ? "col-span-full h-[180px]" : "aspect-square",
              invalid ? "border-clay" : "border-[#b4beaf]",
            )}
          >
            <Camera className="size-7 text-ink" aria-hidden />
            <span className="font-bold text-ink">{value.length ? t("addMore") : t("addPhotos")}</span>
            {value.length === 0 && <small className="text-xs">{t("photosHint")}</small>}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
              multiple
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={t("addPhotos")}
              onChange={(e) => upload(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="hint mt-2">{t("photosRule", { max: MAX_IMAGES })}</p>
      {error && (
        <p role="alert" className="error mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
