"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseInput, runAction } from "@/server/action";
import { requireAdmin } from "@/server/authz";
import { AppError, type ActionResult } from "@/server/errors";
import { db } from "@/server/db";
import { moderateListing } from "@/features/listings/service";
import { grantPromotion } from "@/features/promotions/service";
import { CategoryInput, PromotionProductInput } from "./schema";
import { resolveReport, setUserFlag, updatePromotionProduct, upsertCategory } from "./service";

const Id = z.string().min(1).max(64);
const Note = z.string().trim().max(300).optional();

export async function moderateListingAction(id: string, decision: "approve" | "reject" | "remove", note?: string): Promise<ActionResult> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    const d = z.enum(["approve", "reject", "remove"]).parse(decision);
    const n = Note.parse(note);
    if (d === "reject" && !n) throw new AppError("VALIDATION", "VALIDATION", { note: "reason_required" });
    await moderateListing(admin, Id.parse(id), d, n);
    return undefined;
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function resolveReportAction(id: string, decision: "dismiss" | "resolve" | "remove_listing", note?: string): Promise<ActionResult> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    await resolveReport(admin, Id.parse(id), z.enum(["dismiss", "resolve", "remove_listing"]).parse(decision), Note.parse(note));
    return undefined;
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function setUserFlagAction(id: string, flag: "ban" | "unban" | "verify" | "unverify" | "trust" | "untrust", reason?: string): Promise<ActionResult> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    await setUserFlag(admin, Id.parse(id), z.enum(["ban", "unban", "verify", "unverify", "trust", "untrust"]).parse(flag), Note.parse(reason));
    return undefined;
  });
  if (res.ok) revalidatePath("/admin/perdoruesit");
  return res;
}

export type FormState = ActionResult | null;

export async function saveCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    const input = parseInput(CategoryInput, {
      id: String(fd.get("id") ?? ""),
      name: String(fd.get("name") ?? ""),
      nameEn: String(fd.get("nameEn") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      parentId: String(fd.get("parentId") ?? ""),
      sortOrder: String(fd.get("sortOrder") ?? "0"),
      active: fd.get("active") === "on",
    });
    await upsertCategory(admin, input);
    return undefined;
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function savePromotionProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    const input = parseInput(PromotionProductInput, {
      id: String(fd.get("id") ?? ""),
      price: String(fd.get("price") ?? ""),
      durationHours: fd.get("durationHours") ? String(fd.get("durationHours")) : undefined,
      active: fd.get("active") === "on",
    });
    await updatePromotionProduct(admin, input);
    return undefined;
  });
  if (res.ok) revalidatePath("/admin/promovimet");
  return res;
}

export async function grantPromotionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const admin = await requireAdmin();
    const listingRef = z.string().trim().min(1).max(200).parse(String(fd.get("listing") ?? ""));
    // Accept a listing ID, slug or full URL.
    const slugOrId = listingRef.replace(/^.*\/p\//, "").replace(/[?#].*$/, "");
    const listing = await db.listing.findFirst({ where: { OR: [{ id: slugOrId }, { slug: slugOrId }] }, select: { id: true } });
    if (!listing) throw new AppError("VALIDATION", "VALIDATION", { listing: "listing_not_found" });
    await grantPromotion(admin, { listingId: listing.id, productCode: z.string().min(1).parse(String(fd.get("product") ?? "")), note: Note.parse(String(fd.get("note") ?? "")) });
    return undefined;
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
