import type { Prisma } from "@prisma/client";
import { CoreError } from "@sensel/server";
type Tx = Prisma.TransactionClient;
export async function admin(tx: Tx, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(183528921,1)`;
  const u = await tx.user.findUnique({ where: { id } });
  if (!u?.enabled) throw new CoreError("UNAUTHORIZED", 401);
  if (u.role !== "ADMIN") throw new CoreError("FORBIDDEN", 403);
}
