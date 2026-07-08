-- Automatic timetable generator — new tables.
-- Applied with: node --import tsx scripts/run-sql.ts db/timetable-gen.sql
-- Idempotent (create table if not exists).

-- Per-teacher availability. A row means an explicit override for one slot; the
-- ABSENCE of a row = available. We store rows the admin toggles (usually to mark
-- a slot UNAVAILABLE). slot_index is the 0-based index of the standard day slots.
create table if not exists teacher_availability (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  teacher_id  uuid not null references teachers(id) on delete cascade,
  day         text not null check (day in ('mon','tue','wed','thu','fri')),
  slot_index  int  not null,
  available   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (school_id, teacher_id, day, slot_index)
);
create index if not exists idx_avail_school on teacher_availability(school_id);

-- Saved timetable versions (generated snapshots). data holds the full generated
-- timetable as JSON so we can preview / export / restore without recomputing.
create table if not exists timetable_versions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          text not null,
  term          text not null default '',
  session_count int  not null default 0,
  data          jsonb not null default '{}',
  applied       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ttver_school on timetable_versions(school_id, created_at);
