// Apply a .sql file to the Neon database. Usage: npm run db:setup  (runs db/schema.sql)
//
// Build/dev-time script (scripts/ is excluded in tsconfig, so `next build` never
// type-checks or bundles it). Run via tsx (see package.json).
//
// The schema has NO dollar-quoted ($$) blocks, functions or DO blocks — every
// statement is a single, simple command — so we just strip full-line comments,
// split on ';', and send each statement through Neon's HTTP driver one at a time.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: tsx scripts/run-sql.ts <file.sql>"); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const db = drizzle(neon(process.env.DATABASE_URL));

const statements = readFileSync(file, "utf8")
  .split("\n")
  .filter((line) => !/^\s*--/.test(line)) // drop full-line SQL comments
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

(async () => {
  console.log(`Applying ${statements.length} statements from ${file} ...`);
  let n = 0;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      n++;
    } catch (e) {
      console.error(`\nFailed on statement #${n + 1}:\n${stmt}\n`);
      throw e;
    }
  }
  console.log(`Done — ${n} statements applied.`);
})().catch((e) => { console.error("FAILED:", (e as Error).message ?? e); process.exit(1); });
