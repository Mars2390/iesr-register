// Neon serverless + Drizzle. The HTTP driver is ideal for Vercel serverless
// functions (no persistent connection / pool exhaustion). Use the POOLED
// Neon connection string (…-pooler…) in DATABASE_URL.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export { schema };
