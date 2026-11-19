/** Grant ADMIN to an existing user. The UI can never grant admin. Usage: pnpm admin:grant user@example.com */
import "dotenv/config";
import { db } from "@/server/db";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm admin:grant <email>");
  process.exit(1);
}
const user = await db.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No user with email ${email}. Register first.`);
  process.exit(1);
}
await db.user.update({ where: { id: user.id }, data: { role: "ADMIN", trusted: true } });
await db.auditLog.create({ data: { actorId: null, action: "user.grant_admin", entity: "User", entityId: user.id, after: { via: "cli" } } });
console.log(`${email} is now ADMIN.`);
await db.$disconnect();
