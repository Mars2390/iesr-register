// Seed a demo school + admin PIN + one teacher PIN, so you can log in immediately.
// Usage: npm run db:seed   (after npm run db:setup)
// Prints the school id -> paste into .env as DEFAULT_SCHOOL_ID.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pbkdf2 as _pbkdf2, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import * as schema from "../src/db/schema";

const pbkdf2 = promisify(_pbkdf2);
async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const dk = await pbkdf2(pin.normalize("NFKC"), salt, 100000, 32, "sha256");
  return { hash: dk.toString("hex"), salt: salt.toString("hex") };
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(process.env.DATABASE_URL), { schema });

  const [school] = await db.insert(schema.schools)
    .values({ name: "IESR Demo School", slug: "iesr-demo", settings: {} })
    .returning();

  const adminPin = "1234", teacherPin = "4810";
  const ah = await hashPin(adminPin);
  await db.insert(schema.admins).values({ schoolId: school.id, name: "Head Admin", pinHash: ah.hash, pinSalt: ah.salt });

  const [cls] = await db.insert(schema.classes)
    .values({ schoolId: school.id, code: "CEEMAY2025R", displayName: "Craft Electrical", category: "Craft" })
    .returning();

  const th = await hashPin(teacherPin);
  await db.insert(schema.teachers).values({
    schoolId: school.id, name: "Demo Teacher", pinHash: th.hash, pinSalt: th.salt, classIds: [cls.id],
  });

  console.log("\n  Seed complete.");
  console.log("  DEFAULT_SCHOOL_ID =", school.id, " (paste into .env)");
  console.log(`  Admin PIN   = ${adminPin}`);
  console.log(`  Teacher PIN = ${teacherPin}\n`);
})().catch((e) => { console.error(e); process.exit(1); });
