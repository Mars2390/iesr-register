// Apply a .sql file to the Neon database. Usage: npm run db:setup  (runs schema.sql)
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: tsx db/run-sql.ts <file.sql>"); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = neon(process.env.DATABASE_URL);
const text = readFileSync(file, "utf8");

// Neon's http driver runs one statement per call; split on top-level semicolons.
// schema.sql uses dollar-quoted bodies ($$...$$) for the enum/trigger DO blocks,
// so we split carefully, preserving $$-delimited sections.
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
  for (const stmt of statements) await sql.query(stmt);
  console.log("Done.");
})().catch((e) => { console.error(e); process.exit(1); });
