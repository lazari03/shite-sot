/** Pure authorisation rules — no I/O, unit-tested. */
export type Actor = { id: string; role: "USER" | "ADMIN"; banned: boolean; trusted: boolean };

export function isAdmin(a: Actor | null | undefined): boolean {
  return Boolean(a && !a.banned && a.role === "ADMIN");
}

export function canManageListing(a: Actor | null | undefined, listing: { sellerId: string }): boolean {
  if (!a || a.banned) return false;
  return a.role === "ADMIN" || a.id === listing.sellerId;
}

/** Only the owner (not admins) acts as seller: edits, mark sold, submit. Admins moderate instead. */
export function isListingOwner(a: Actor | null | undefined, listing: { sellerId: string }): boolean {
  return Boolean(a && !a.banned && a.id === listing.sellerId);
}

export type ModerationMode = "all" | "first_n" | "none";

/** Does a submission by this seller need pre-moderation? */
export function needsModeration(opts: { mode: ModerationMode; trusted: boolean; approvedCount: number; trustAfter: number }): boolean {
  if (opts.trusted || opts.mode === "none") return false;
  if (opts.mode === "all") return true;
  return opts.approvedCount < opts.trustAfter;
}
