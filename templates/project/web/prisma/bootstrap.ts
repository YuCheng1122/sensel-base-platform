import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password.length > 72)
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12–72 characters)");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Administrator already exists; unchanged.");
    return;
  }
  await db.user.create({
    data: {
      email,
      name: "Administrator",
      passwordHash: await hash(password, 12),
      role: "ADMIN",
    },
  });
  console.log("Administrator created.");
}
main()
  .catch(() => {
    console.error("Bootstrap failed; check configuration and database.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
