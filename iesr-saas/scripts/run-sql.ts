// Apply a .sql file to the Neon database. Usage: npm run db:setup  (runs db/schema.sql)
//
// NOTE: a build/dev-time script, NOT part of the Next.js app. It lives in
// scripts/ (excluded in tsconfig) so `next build` never type-checks or bundles it.
// Run via tsx (see package.json). Raw SQL goes through Drizzle's db.execute(sql.raw())
// on the Neon HTTP driver — correctly typed and one statement per request.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: tsx scripts/run-sql.ts <file.sql>"); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const db = drizzle(neon(process.env.DATABASE_URL));
const text = readFileSync(file, "utf8");

// The Neon HTTP driver runs one statement per request, so split on top-level
// semicolons while preserving dollar-quoted bodies ($$...$$) used by the enum/
// trigger DO blocks in schema.sql.
function splitSql(s: string): string[] {
  const out: string[] = [];
  let buf = "", inDollar = false;
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === "$$") { inDollar = !inDollar; buf += two; i++; continue; }
    const c = s[i];
    if (c === ";" && !inDollar) { if (buf.trim()) out.push(buf.trim()); buf = ""; }
    else buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

(async () => {
  const statements = splitSql(text);
  console.log(`Applying ${statements.length} statements from ${file} ...`);
  for (const stmt of statements) await db.execute(sql.raw(stmt));
  console.log("Done.");
})().catch((e) => { console.error(e); process.exit(1); });
