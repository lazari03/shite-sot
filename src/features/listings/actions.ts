"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseInput, runAction } from "@/server/action";
import { requireUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import type { ActionResult } from "@/server/errors";
import { db } from "@/server/db";
import { ContactSettingsInput, ListingInput } from "./schema";
import { createDraft, deleteListing, ownerTransition, submitListing, updateListing } from "./service";

function formToInput(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    categoryId: String(fd.get("categoryId") ?? ""),
    cityId: String(fd.get("cityId") ?? ""),
    condition: String(fd.get("condition") ?? ""),
    currency: String(fd.get("currency") ?? "EUR"),
    price: String(fd.get("price") ?? ""),
    referencePrice: String(fd.get("referencePrice") ?? ""),
    referencePriceSource: String(fd.get("referencePriceSource") ?? ""),
    locationNote: String(fd.get("locationNote") ?? ""),
    imageIds: fd.getAll("imageIds").map(String).filter(Boolean),
  };
}

export type SaveListingState = ActionResult<{ id: string; sentToReview?: boolean }> | null;

/** Create or update; `intent` = "draft" stays on the form, "preview" goes to the preview page. */
export async function saveListingAction(_prev: SaveListingState, fd: FormData): Promise<SaveListingState> {
  const id = String(fd.get("id") ?? "") || null;
  const intent = String(fd.get("intent") ?? "preview");
  const res = await runAction(async () => {
    const user = await requireUser();
    await rateLimit(id ? "listing:update" : "listing:create", user.id);
    const input = parseInput(ListingInput, formToInput(fd));
    // Optional inline WhatsApp opt-in (shown when the seller hasn't set up contact yet).
    if (fd.has("whatsapp")) {
      const contact = parseInput(ContactSettingsInput, { whatsapp: String(fd.get("whatsapp") ?? ""), contactConsent: fd.get("contactConsent") === "on" });
      if (contact.whatsapp) await db.user.update({ where: { id: user.id }, data: contact });
    }
    if (id) {
      const { listing, sentToReview } = await updateListing(user, id, input);
      return { id: listing.id, sentToReview };
    }
    const listing = await createDraft(user, input);
    return { id: listing.id };
  });
  if (res.ok) {
    revalidatePath("/paneli");
    if (intent === "preview") redirect(`/paneli/njoftimet/${res.data.id}${res.data.sentToReview ? "?rishikim=1" : ""}`);
    if (!id) redirect(`/paneli/njoftimet/${res.data.id}/ndrysho?ruajtur=1`);
  }
  return res;
}

export async function submitListingAction(id: string): Promise<ActionResult<{ status: string }>> {
  const res = await runAction(async () => {
    const user = await requireUser();
    await rateLimit("listing:submit", user.id);
    const l = await submitListing(user, id);
    return { status: l.status };
  });
  if (res.ok) {
    revalidatePath("/", "layout");
  }
  return res;
}

export async function ownerTransitionAction(id: string, reason: "mark_sold" | "unmark_sold" | "withdraw"): Promise<ActionResult<{ status: string }>> {
  const res = await runAction(async () => {
    const user = await requireUser();
    await rateLimit("listing:update", user.id);
    const l = await ownerTransition(user, id, reason);
    return { status: l.status };
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function deleteListingAction(id: string): Promise<ActionResult> {
  const res = await runAction(async () => {
    const user = await requireUser();
    await rateLimit("listing:update", user.id);
    await deleteListing(user, id);
    return undefined;
  });
  if (res.ok) revalidatePath("/paneli");
  return res;
}
