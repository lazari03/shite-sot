import "server-only";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { isAdmin, type Actor } from "@/features/auth/policy";
import { transitionListing } from "@/features/listings/state";
import { parsePriceToMinor } from "@/lib/money";
import type { z } from "zod";
import type { CategoryInput, PromotionProductInput } from "./schema";

function assertAdmin(a: Actor) {
  if (!isAdmin(a)) throw new AppError("FORBIDDEN", "FORBIDDEN");
}

export async function resolveReport(actor: Actor, reportId: string, decision: "dismiss" | "resolve" | "remove_listing", note?: string) {
  assertAdmin(actor);
  await db.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId }, include: { listing: true } });
    if (!report) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (report.status !== "OPEN") throw new AppError("INVALID_STATE", "report_closed");
    if (decision === "remove_listing" && report.listing.status !== "REMOVED") {
      await transitionListing(tx, report.listing, "remove", "REMOVED", { actorId: actor.id, asAdmin: true, note: note ?? `report:${report.reason}` });
    }
    const status = decision === "dismiss" ? "DISMISSED" : "RESOLVED";
    // Close every open report on the listing when it is removed.
    const where = decision === "remove_listing" ? { listingId: report.listingId, status: "OPEN" as const } : { id: report.id };
    await tx.report.updateMany({ where, data: { status, resolvedById: actor.id, resolvedAt: new Date(), resolution: note ?? decision } });
    await audit(tx, { actorId: actor.id, action: `report.${decision}`, entity: "Report", entityId: report.id, before: { status: report.status }, after: { status, note } });
  });
}

export async function setUserFlag(actor: Actor, userId: string, flag: "ban" | "unban" | "verify" | "unverify" | "trust" | "untrust", reason?: string) {
  assertAdmin(actor);
  if (userId === actor.id && (flag === "ban" || flag === "untrust")) throw new AppError("FORBIDDEN", "cannot_target_self");
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id: userId }, select: { bannedAt: true, verifiedAt: true, trusted: true, role: true } });
    if (!before) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (flag === "ban" && before.role === "ADMIN") throw new AppError("FORBIDDEN", "cannot_ban_admin");
    const now = new Date();
    const data =
      flag === "ban"
        ? { bannedAt: now, banReason: reason ?? null }
        : flag === "unban"
          ? { bannedAt: null, banReason: null }
          : flag === "verify"
            ? { verifiedAt: now }
            : flag === "unverify"
              ? { verifiedAt: null }
              : { trusted: flag === "trust" };
    await tx.user.update({ where: { id: userId }, data });
    if (flag === "ban") await tx.session.deleteMany({ where: { userId } });
    await audit(tx, { actorId: actor.id, action: `user.${flag}`, entity: "User", entityId: userId, before, after: { ...data, reason } });
  });
}

export async function upsertCategory(actor: Actor, input: z.output<typeof CategoryInput>) {
  assertAdmin(actor);
  return db.$transaction(async (tx) => {
    if (input.parentId) {
      const parent = await tx.category.findUnique({ where: { id: input.parentId }, select: { parentId: true, id: true } });
      // Two levels only.
      if (!parent || parent.parentId || parent.id === input.id) throw new AppError("VALIDATION", "VALIDATION", { parentId: "parent_invalid" });
    }
    const clash = await tx.category.findFirst({ where: { slug: input.slug, ...(input.id ? { id: { not: input.id } } : {}) }, select: { id: true } });
    if (clash) throw new AppError("VALIDATION", "VALIDATION", { slug: "slug_taken" });
    const data = { name: input.name, nameEn: input.nameEn, slug: input.slug, parentId: input.parentId, sortOrder: input.sortOrder, active: input.active };
    const before = input.id ? await tx.category.findUnique({ where: { id: input.id } }) : null;
    const cat = input.id ? await tx.category.update({ where: { id: input.id }, data }) : await tx.category.create({ data });
    await audit(tx, { actorId: actor.id, action: input.id ? "category.update" : "category.create", entity: "Category", entityId: cat.id, before, after: data });
    return cat;
  });
}

export async function updatePromotionProduct(actor: Actor, input: z.output<typeof PromotionProductInput>) {
  assertAdmin(actor);
  return db.$transaction(async (tx) => {
    const before = await tx.promotionProduct.findUnique({ where: { id: input.id } });
    if (!before) throw new AppError("NOT_FOUND", "NOT_FOUND");
    const priceMinor = parsePriceToMinor(input.price, before.currency);
    if (priceMinor === null) throw new AppError("VALIDATION", "VALIDATION", { price: "price_invalid" });
    const after = await tx.promotionProduct.update({
      where: { id: input.id },
      data: { priceMinor, active: input.active, durationHours: before.placement ? (input.durationHours ?? before.durationHours) : before.durationHours },
    });
    await audit(tx, { actorId: actor.id, action: "promotion_product.update", entity: "PromotionProduct", entityId: after.id, before, after });
    return after;
  });
}
