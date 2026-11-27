import "server-only";
import { z } from "zod";
import { env } from "@/env";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { log } from "@/server/logger";
import { storage } from "@/server/storage";
import { AI_REVIEW_DECLINED, assessComparablePrice } from "./ai-review-policy";
import { validateSubmission } from "./service";
import { transitionListing } from "./state";

const Review = z.object({ decision: z.enum(["approve", "decline", "needs_human_review"]) });
const Response = z.object({
  status: z.literal("completed"),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })),
});

function redact(text: string) {
  return text
    .replace(/https?:\/\/\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi, "[contact redacted]")
    .replace(/(?:\+?\d[ .()-]*){8,}/g, "[contact redacted]");
}

async function reviewListing(apiKey: string, model: string, instructions: string, listing: object, photos: Buffer[]) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      model,
      store: false,
      instructions,
      input: [{ role: "user", content: [
        { type: "input_text", text: JSON.stringify(listing) },
        ...photos.map((photo) => ({ type: "input_image", detail: "high", image_url: `data:image/webp;base64,${photo.toString("base64")}` })),
      ] }],
      // Reasoning models spend tokens thinking before answering; 100 made every reply "incomplete".
      max_output_tokens: 2000,
      text: { format: { type: "json_schema", name: "listing_review", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["decision"],
        properties: { decision: { type: "string", enum: ["approve", "decline", "needs_human_review"] } },
      } } },
    }),
  });
  if (!response.ok) throw new Error(`Moderation provider HTTP ${response.status}`);
  const json: unknown = await response.json();
  const result = Response.safeParse(json);
  if (!result.success) {
    const status = (json as { status?: unknown; incomplete_details?: unknown } | null) ?? {};
    log.warn("AI moderation: unusable provider response", { status: status.status, incomplete: status.incomplete_details });
    return "needs_human_review";
  }
  const output = result.data.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? []);
  const [message] = output;
  if (output.length !== 1 || message?.type !== "output_text" || !message.text) return "needs_human_review";
  const decision = Review.safeParse(JSON.parse(message.text));
  return decision.success ? decision.data.decision : "needs_human_review";
}

export async function moderateNextListing() {
  const config = env();
  if (!config.AI_MODERATION_ENABLED || !config.OPENAI_API_KEY) return 0;
  const prompt = await db.moderationPrompt.findUnique({ where: { key: "listing_review_v1" } });
  if (!prompt?.instructions.trim()) {
    log.warn("AI moderation: review prompt listing_review_v1 missing in ModerationPrompt");
    return 0;
  }

  // Only auto-review sellers with a confirmed email, unless the site runs without email verification.
  const sellerGate = config.REQUIRE_EMAIL_VERIFICATION
    ? { bannedAt: null, deletedAt: null, emailVerified: true }
    : { bannedAt: null, deletedAt: null };
  const eligible = {
    status: "PENDING_REVIEW" as const,
    publishedAt: null,
    seller: sellerGate,
    aiModerationCheckedAt: null,
    OR: [{ rejectionReason: null }, { rejectionReason: { not: AI_REVIEW_DECLINED } }],
  };
  const listing = await db.listing.findFirst({
    where: eligible,
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    include: { images: { orderBy: { position: "asc" }, select: { key: true } }, category: { select: { name: true, active: true } }, city: { select: { active: true } } },
  });
  if (!listing) return 0;

  const checkedAt = new Date();
  const claim = await db.listing.updateMany({
    where: { ...eligible, id: listing.id, updatedAt: listing.updatedAt },
    data: { aiModerationCheckedAt: checkedAt, updatedAt: listing.updatedAt },
  });
  // Every skip is logged so an admin can see why a listing was left for human review.
  const skip = (reason: string) => {
    log.info("AI moderation: left for human review", { listingId: listing.id, reason });
    return 0;
  };
  if (!claim.count) return 0;
  if (!listing.category.active || !listing.city.active) return skip("inactive category or city");
  if (!listing.images.length || listing.images.length > 8) return skip("photo count");
  try {
    await validateSubmission(db, listing);
  } catch (error) {
    return skip(`failed submission checks: ${error instanceof AppError ? error.messageKey : "unknown"}`);
  }
  const title = redact(listing.title);
  const description = redact(listing.description);
  if (title !== listing.title || description !== listing.description) return skip("text looks like it contains contact details (phone, email or link)");
  const photos = await Promise.all(listing.images.map(({ key }) => storage().read(`${key}/320.webp`)));
  if (photos.some((photo) => !photo?.length || photo.length > 512_000)) return skip("a photo could not be read from storage");

  let decision: Awaited<ReturnType<typeof reviewListing>>;
  try {
    decision = await reviewListing(config.OPENAI_API_KEY, config.OPENAI_MODERATION_MODEL, prompt.instructions, {
      title, description, category: listing.category.name, condition: listing.condition, priceMinor: listing.priceMinor, currency: listing.currency,
    }, photos.filter((photo): photo is Buffer => photo !== null));
  } catch (error) {
    // Provider/network failure is not a review: release the claim so the next run retries this listing.
    await db.listing.updateMany({
      where: { id: listing.id, aiModerationCheckedAt: checkedAt },
      data: { aiModerationCheckedAt: null, updatedAt: listing.updatedAt },
    });
    log.warn("AI moderation call failed, will retry", { listingId: listing.id, err: error });
    return 0;
  }
  log.info("AI moderation decision", { listingId: listing.id, decision, model: config.OPENAI_MODERATION_MODEL });
  if (decision === "needs_human_review") return 0;

  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.listing.findFirst({
        where: {
          ...eligible, id: listing.id, updatedAt: listing.updatedAt, aiModerationCheckedAt: checkedAt,
          category: { active: true }, city: { active: true },
        },
      });
      if (!current) return 0;
      await validateSubmission(tx, current);
      if (decision === "decline") {
        await transitionListing(tx, current, "reject", "AUTO", {
          actorId: null,
          asAdmin: true,
          note: AI_REVIEW_DECLINED,
          expectedAiReview: { updatedAt: listing.updatedAt, checkedAt },
        });
        return 0;
      }
      const comparables = await tx.listing.findMany({
        where: {
          sellerId: { not: current.sellerId },
          seller: sellerGate,
          title: { equals: current.title, mode: "insensitive" },
          status: "SOLD",
          categoryId: current.categoryId,
          currency: current.currency,
          condition: current.condition,
          soldAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
        },
        distinct: ["sellerId"],
        orderBy: [{ soldAt: "desc" }, { id: "desc" }],
        take: 12,
        select: { priceMinor: true },
      });
      const priceAssessment = assessComparablePrice(current.priceMinor, comparables.map(({ priceMinor }) => priceMinor));
      await transitionListing(tx, current, "approve", "AUTO", {
        actorId: null,
        asAdmin: true,
        note: `AI moderation · ${prompt.key} · ${config.OPENAI_MODERATION_MODEL}`,
        expectedAiReview: { updatedAt: listing.updatedAt, checkedAt },
      });
      if (priceAssessment) await tx.listing.update({ where: { id: current.id }, data: { priceAssessment } });
      return 1;
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "CONFLICT") return 0;
    throw error;
  }
}
