import { z } from "zod";
import { parsePriceToMinor } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";

export const CONDITIONS = ["NEW", "LIKE_NEW", "VERY_GOOD", "GOOD", "FAIR"] as const;
export const CURRENCIES = ["EUR", "ALL"] as const;
export const MAX_IMAGES = 8;

// Messages are i18n keys in the "errors" namespace.
const title = z.string().trim().min(5, "title_min").max(80, "title_max");
const description = z.string().trim().min(20, "description_min").max(2000, "description_max");

/** Shared by the sell form (client) and the server action. Price arrives as user text. */
export const ListingInput = z
  .object({
    title,
    description,
    categoryId: z.string().min(1, "category_required"),
    cityId: z.string().min(1, "city_required"),
    condition: z.enum(CONDITIONS, { message: "condition_required" }),
    currency: z.enum(CURRENCIES).default("EUR"),
    price: z.string().trim().min(1, "price_required"),
    referencePrice: z.string().trim().optional().default(""),
    referencePriceSource: z.string().trim().max(120, "reference_source_max").optional().default(""),
    locationNote: z.string().trim().max(60, "location_max").optional().default(""),
    imageIds: z.array(z.string().min(1)).max(MAX_IMAGES, "images_max").default([]),
  })
  .transform((v, ctx) => {
    const priceMinor = parsePriceToMinor(v.price, v.currency);
    if (priceMinor === null) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "price_invalid" });
      return z.NEVER;
    }
    let referencePriceMinor: number | null = null;
    if (v.referencePrice) {
      referencePriceMinor = parsePriceToMinor(v.referencePrice, v.currency);
      if (referencePriceMinor === null) {
        ctx.addIssue({ code: "custom", path: ["referencePrice"], message: "price_invalid" });
        return z.NEVER;
      }
      if (referencePriceMinor <= priceMinor) {
        ctx.addIssue({ code: "custom", path: ["referencePrice"], message: "reference_not_higher" });
        return z.NEVER;
      }
      if (!v.referencePriceSource) {
        ctx.addIssue({ code: "custom", path: ["referencePriceSource"], message: "reference_source_required" });
        return z.NEVER;
      }
    }
    return {
      title: v.title,
      description: v.description,
      categoryId: v.categoryId,
      cityId: v.cityId,
      condition: v.condition,
      currency: v.currency,
      priceMinor,
      referencePriceMinor,
      referencePriceSource: referencePriceMinor ? v.referencePriceSource : null,
      locationNote: v.locationNote || null,
      imageIds: v.imageIds,
    };
  });
export type ListingInputValue = z.output<typeof ListingInput>;

/** Requirements to leave DRAFT: at least one real photo. */
export const SubmitRequirements = z.object({ imageCount: z.number().int().min(1, "images_required") });

export const ReportInput = z.object({
  listingId: z.string().min(1),
  reason: z.enum(["MISLEADING_PRICE", "FAKE_PHOTOS", "WRONG_CONDITION", "PROHIBITED_ITEM", "SCAM", "DUPLICATE", "OTHER"], { message: "reason_required" }),
  details: z.string().trim().max(500, "details_max").optional().default(""),
});

export const ContactSettingsInput = z
  .object({
    whatsapp: z.string().trim().optional().default(""),
    contactConsent: z.boolean().default(false),
  })
  .transform((v, ctx) => {
    if (!v.whatsapp) {
      if (v.contactConsent) {
        ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "whatsapp_required" });
        return z.NEVER;
      }
      return { whatsapp: null, contactConsent: false };
    }
    const n = normalizePhone(v.whatsapp);
    if (!n) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "whatsapp_invalid" });
      return z.NEVER;
    }
    return { whatsapp: n, contactConsent: v.contactConsent };
  });

export const SORTS = ["ending", "newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];

export const DiscoveryFilters = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z.string().max(60).optional().catch(undefined),
  city: z.string().max(60).optional().catch(undefined),
  condition: z.enum(CONDITIONS).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(100_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(100_000_000).optional().catch(undefined),
  sort: z.enum(SORTS).default("ending").catch("ending"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});
export type DiscoveryFiltersValue = z.output<typeof DiscoveryFilters>;
