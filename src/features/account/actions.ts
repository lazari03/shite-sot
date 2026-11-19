"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { parseInput, runAction } from "@/server/action";
import { requireUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { AppError, type ActionResult } from "@/server/errors";
import { ProfileInput } from "./schema";
import { deleteAccount } from "./service";

export type ProfileState = ActionResult | null;

export async function updateProfileAction(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const res = await runAction(async () => {
    const user = await requireUser();
    await rateLimit("account:update", user.id);
    const input = parseInput(ProfileInput, {
      name: String(fd.get("name") ?? ""),
      city: String(fd.get("city") ?? ""),
      bio: String(fd.get("bio") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      contactConsent: fd.get("contactConsent") === "on",
    });
    await db.user.update({
      where: { id: user.id },
      data: { name: input.name, city: input.city || null, bio: input.bio || null, whatsapp: input.whatsapp, contactConsent: input.contactConsent },
    });
    return undefined;
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export type DeleteState = ActionResult | null;

export async function deleteAccountAction(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  const res = await runAction(async () => {
    const user = await requireUser();
    if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new AppError("VALIDATION", "VALIDATION", { confirm: "confirm_email_mismatch" });
    }
    await deleteAccount(user.id);
    await auth().api.signOut({ headers: await headers() }).catch(() => undefined);
    return undefined;
  });
  if (res.ok) redirect("/?llogaria=fshire");
  return res;
}
