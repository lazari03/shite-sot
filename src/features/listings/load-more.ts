"use server";

import { getCurrentUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { requestFingerprint } from "@/features/analytics/service";
import { discoverListings, favoriteIdsFor } from "./queries";
import { DiscoveryFilters } from "./schema";

export async function loadMoreListings(input: unknown) {
  const filters = DiscoveryFilters.parse(input);
  const user = await getCurrentUser();
  const fingerprint = await requestFingerprint();
  await rateLimit("search", user?.id ?? fingerprint.visitorHash);
  const now = new Date();
  const result = await discoverListings(filters, now);
  const saved = await favoriteIdsFor(user?.id, result.items.map((item) => item.id));
  return { ...result, saved: [...saved], loggedIn: Boolean(user), serverNow: now.getTime() };
}
