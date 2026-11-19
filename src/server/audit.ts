import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx, Db } from "./db";

export async function audit(
  client: Tx | Db,
  entry: { actorId: string | null; action: string; entity: string; entityId: string; before?: unknown; after?: unknown },
) {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
