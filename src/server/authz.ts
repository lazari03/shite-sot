import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { AppError } from "./errors";
import { canManageListing, type Actor } from "@/features/auth/policy";

export type CurrentUser = Actor & { name: string; email: string; image: string | null; emailVerified: boolean };

/** Cached per request. Returns null for anonymous, banned or deleted users. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, emailVerified: true, bannedAt: true, deletedAt: true, trusted: true },
  });
  if (!u || u.deletedAt) return null;
  return { id: u.id, name: u.name, email: u.email, image: u.image, role: u.role, emailVerified: u.emailVerified, banned: Boolean(u.bannedAt), trusted: u.trusted };
});

/** For server actions / route handlers. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("UNAUTHENTICATED", "UNAUTHENTICATED");
  if (u.banned) throw new AppError("BANNED", "BANNED");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new AppError("FORBIDDEN", "FORBIDDEN");
  return u;
}

/** For pages: redirect to login instead of throwing. */
export async function requireUserPage(next: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u || u.banned) redirect(`/hyr?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const u = await requireUserPage("/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}

/** Object-level check: loads the listing and verifies ownership (or admin). */
export async function requireListingAccess(listingId: string, user: Actor) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
  if (!canManageListing(user, listing)) throw new AppError("FORBIDDEN", "FORBIDDEN");
  return listing;
}
