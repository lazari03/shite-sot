const MAP: Record<string, string> = { ë: "e", Ë: "e", ç: "c", Ç: "c" };

export function slugify(input: string, max = 60): string {
  return input
    .replace(/[ëËçÇ]/g, (c) => MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Short random suffix so slugs are unique without leaking sequential IDs. */
export function slugSuffix(len = 6): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function listingSlug(title: string): string {
  return `${slugify(title) || "produkt"}-${slugSuffix()}`;
}
