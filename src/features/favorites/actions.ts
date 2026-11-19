"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { requireUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { db } from "@/server/db";
import { AppError, type ActionResult } from "@/server/errors";
import { track } from "@/features/analytics/service";
import { z } from "zod";

export async function toggleFavoriteAction(listingId: string): Promise<ActionResult<{ saved: boolean }>> {
  const res = await runAction(async () => {
    const id = z.string().min(1).max(64).parse(listingId);
    const user = await requireUser();
    await rateLimit("favorite", user.id);
    const listing = await db.listing.findUnique({ where: { id }, select: { id: true, status: true, categoryId: true } });
    // Only public (or previously public) listings can be saved.
    if (!listing || listing.status === "DRAFT" || listing.status === "PENDING_REVIEW" || listing.status === "REMOVED" || listing.status === "REJECTED") {
      throw new AppError("NOT_FOUND", "NOT_FOUND");
    }
    const saved = await db.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } } });
      if (existing) {
        await tx.favorite.delete({ where: { userId_listingId: { userId: user.id, listingId: id } } });
        await tx.listing.update({ where: { id }, data: { favoriteCount: { decrement: 1 } } });
        return false;
      }
      await tx.favorite.create({ data: { userId: user.id, listingId: id } });
      await tx.listing.update({ where: { id }, data: { favoriteCount: { increment: 1 } } });
      return true;
    });
    await track(saved ? "FAVORITE_ADDED" : "FAVORITE_REMOVED", { listingId: id, categoryId: listing.categoryId, userId: user.id });
    return { saved };
  });
  if (res.ok) revalidatePath("/ruajtura");
  return res;
}
