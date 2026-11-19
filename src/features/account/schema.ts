import { z } from "zod";
import { ContactSettingsInput } from "@/features/listings/schema";

export const ProfileInput = z
  .object({
    name: z.string().trim().min(2, "name_min").max(40, "name_max"),
    city: z.string().trim().max(40, "city_max").optional().default(""),
    bio: z.string().trim().max(300, "bio_max").optional().default(""),
  })
  .and(ContactSettingsInput);
