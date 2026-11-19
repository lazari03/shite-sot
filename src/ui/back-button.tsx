"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function BackButton({ label, className, fallback = "/" }: { label: string; className?: string; fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn("iconbtn h-14", className)}
      aria-label={label}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ChevronLeft className="size-6" aria-hidden />
    </button>
  );
}
