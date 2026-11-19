import { z } from "zod";
import { slugify } from "@/lib/slug";

export const CategoryInput = z
  .object({
    id: z.string().optional().default(""),
    name: z.string().trim().min(2, "name_min").max(40, "name_max"),
    nameEn: z.string().trim().min(2, "name_min").max(40, "name_max"),
    slug: z.string().trim().max(50).optional().default(""),
    parentId: z.string().optional().default(""),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    active: z.boolean().default(true),
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.name, 50), id: v.id || null, parentId: v.parentId || null }));

export const PromotionProductInput = z.object({
  id: z.string().min(1),
  price: z.string().trim().min(1, "price_required"),
  durationHours: z.coerce.number().int().min(1).max(48).optional().catch(undefined),
  active: z.boolean().default(true),
});
