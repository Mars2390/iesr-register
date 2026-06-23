# IESR SaaS — School Attendance (Next.js + Neon)

Rebuild of the legacy single-file IESR register as a proper SaaS app.

**Stack:** Next.js (App Router, Vercel) · Neon serverless Postgres · Drizzle ORM ·
custom PIN→JWT auth (PBKDF2 + jose, httpOnly cookie) · live admin monitor via
polling (SWR) · jsPDF for exports.

## Why Neon (not Supabase)
PIN auth is custom either way (Supabase Auth has no PIN flow), and the admin
dashboard is fully custom — so Supabase's Auth/Realtime/console add little here.
Neon gives Vercel-native serverless Postgres, DB branching per preview, scale-to-zero,
lowest cost, zero lock-in. The one trade-off — no hosted realtime — is covered by
3–5s polling for the live monitor (upgradeable to Ably/Upstash push later).

## Setup
```bash
npm install
cp .env.example .env            # fill DATABASE_URL (Neon pooled) + AUTH_SECRET
npm run db:setup                # apply db/schema.sql to Neon
npm run db:seed                 # demo school + PINs; paste DEFAULT_SCHOOL_ID into .env
npm run dev
```
Seed prints: **Admin PIN 1234**, **Teacher PIN 4810**.

## Auth flow (PIN-based)
1. `/login` → POST `/api/auth/login { pin }`.
2. Server (Node runtime) verifies the PIN against the admin PIN, then each active
   teacher (per-salt PBKDF2). No name needed — the PIN identifies the person.
3. On match → signed JWT (`role`, `schoolId`, `sub`, `classIds`) in an httpOnly
   cookie. `middleware.ts` gates `/admin` (admin only) and `/teacher` (teacher only).
4. `/api/auth/me` returns the session; `/api/auth/logout` clears it.

> Add login rate-limiting/lockout before production (4-digit PINs are low-entropy).

## Schema
`db/schema.sql` is the source of truth (`src/db/schema.ts` mirrors it for typed
queries). Tables: schools, **admins**, classes, students, teachers, subjects,
timetables, attendance_records, flags_issues, **activity_log**, **marking_presence**.
Bold = added beyond the original 8 (admin PIN auth; teacher activity feed; live
"who's marking" presence). `teachers.class_ids` is a `uuid[]` (as specced; a
`teacher_classes` junction table is the stricter-integrity alternative).

## What's ported from the legacy app
Marking statuses (present/absent/late/unmarked ← P/A/L/U), session/date keys,
PIN concept (now real PBKDF2), analytics (calculateIntelligence/insights/momentum),
flags/conflicts, class–subject–timetable relationships, jsPDF/CSV export.
Removed: Apps Script/SheetsAPI, splash + OTA updater, CLASS_CONFIG, IndexedDB/
GoogleSheetsSync, XOR "encryption", localStorage caching, proxy.js.

## Roadmap (Phase 2)
Landing `/` · `/login` UI (PIN pad) · `/teacher` (assigned classes, mark, history,
flags) · `/admin` (live monitor, student overview, flags, activity, reports) ·
ported `lib/attendance.ts`, `lib/analytics.ts`, `lib/export/{csv,pdf}.ts` ·
`/api/{attendance,presence,flags,monitor,reports}`.
