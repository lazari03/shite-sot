import { formatPrice, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/cn";

export function Price({ minor, currency, className }: { minor: number; currency: CurrencyCode; className?: string }) {
  return <strong className={cn("price", className)}>{formatPrice(minor, currency)}</strong>;
}
