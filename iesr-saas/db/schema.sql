-- =============================================================================
-- IESR SaaS — Neon Postgres schema
-- Design: single school NOW, multi-tenant READY (school_id on every table).
-- Run once on a fresh Neon database (SQL editor or `psql $DATABASE_URL -f db/schema.sql`).
--
-- Tables beyond your original 8 (flagged "ADDED"): admins, activity_log,
-- marking_presence — each is required by a feature you asked for and explained
-- inline. Everything else matches your spec.
-- =============================================================================

create extension if not exists pgcrypto;   -- provides gen_random_uuid()

-- ---------- enums ----------
do $$ begin create type attendance_status as enum ('present','absent','late','unmarked');
exception when duplicate_object then null; end $$;

do $$ begin create type day_of_week as enum ('mon','tue','wed','thu','fri','sat','sun');
exception when duplicate_object then null; end $$;

do $$ begin create type flag_status as enum ('open','acknowledged','resolved');
exception when duplicate_object then null; end $$;

-- ---------- shared updated_at trigger ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- =============================================================================
-- schools
-- =============================================================================
create table if not exists schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  settings   jsonb not null default '{}'::jsonb,   -- branding, term dates, marking windows, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_schools_updated on schools;
create trigger trg_schools_updated before update on schools
  for each row execute function set_updated_at();

-- =============================================================================
-- admins  (ADDED — admin PIN auth; full access. Mirrors teacher PIN hashing.)
-- =============================================================================
create table if not exists admins (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  name           text not null default 'Administrator',
  pin_hash       text not null,        -- PBKDF2-HMAC-SHA256 hash (hex), hashed server-side
  pin_salt       text not null,        -- per-admin salt (hex)
  pin_iterations integer not null default 100000,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_admins_updated on admins;
create trigger trg_admins_updated before update on admins
  for each row execute function set_updated_at();
create index if not exists idx_admins_school on admins(school_id) where active;

-- =============================================================================
-- classes
-- =============================================================================
create table if not exists classes (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  code         text not null,
  display_name text not null,
  category     text not null default 'Other',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (school_id, code)
);
drop trigger if exists trg_classes_updated on classes;
create trigger trg_classes_updated before update on classes
  for each row execute function set_updated_at();
create index if not exists idx_classes_school on classes(school_id);

-- =============================================================================
-- students
-- =============================================================================
create table if not exists students (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  admission_no text not null,
  full_name    text not null,
  class_id     uuid references classes(id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (school_id, admission_no)
);
drop trigger if exists trg_students_updated on students;
create trigger trg_students_updated before update on students
  for each row execute function set_updated_at();
create index if not exists idx_students_school on students(school_id);
create index if not exists idx_students_class  on students(class_id);

-- =============================================================================
-- teachers
--   class_ids uuid[]  — kept as you specced (matches the old CSV "Classes" field).
--   GIN-indexed for "teachers of class X" lookups. A teacher_classes junction
--   table is the stricter-integrity alternative (see README); easy to migrate to.
-- =============================================================================
create table if not exists teachers (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  name           text not null,
  pin_hash       text not null,
  pin_salt       text not null,
  pin_iterations integer not null default 100000,
  class_ids      uuid[] not null default '{}',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_teachers_updated on teachers;
create trigger trg_teachers_updated before update on teachers
  for each row execute function set_updated_at();
create index if not exists idx_teachers_school    on teachers(school_id) where active;
create index if not exists idx_teachers_class_ids on teachers using gin (class_ids);

-- =============================================================================
-- subjects
-- =============================================================================
create table if not exists subjects (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  code       text not null,
  name       text not null,
  class_id   uuid references classes(id) on delete cascade,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code)
);
drop trigger if exists trg_subjects_updated on subjects;
create trigger trg_subjects_updated before update on subjects
  for each row execute function set_updated_at();
create index if not exists idx_subjects_school on subjects(school_id);
create index if not exists idx_subjects_class  on subjects(class_id);

-- =============================================================================
-- timetables
-- =============================================================================
create table if not exists timetables (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  day        day_of_week not null,
  start_time time not null,
  end_time   time not null,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_timetables_updated on timetables;
create trigger trg_timetables_updated before update on timetables
  for each row execute function set_updated_at();
create index if not exists idx_timetables_school on timetables(school_id);
create index if not exists idx_timetables_class_day on timetables(class_id, day);

-- =============================================================================
-- attendance_records
--   session_id: text key for a specific lesson instance (day/period/subject),
--   ported from the old `admNo|date|sessionId` marking key. The UNIQUE constraint
--   makes re-marking an idempotent upsert (one row per student/date/session).
-- =============================================================================
create table if not exists attendance_records (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  date       date not null,
  session_id text not null,
  subject_id uuid references subjects(id) on delete set null,
  status     attendance_status not null default 'unmarked',
  teacher_id uuid references teachers(id) on delete set null,
  tags       jsonb not null default '[]'::jsonb,   -- behavior tags ported from TagsJSON
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, date, session_id)
);
drop trigger if exists trg_attendance_updated on attendance_records;
create trigger trg_attendance_updated before update on attendance_records
  for each row execute function set_updated_at();
create index if not exists idx_att_school_class_date on attendance_records(school_id, class_id, date);
create index if not exists idx_att_school_date_status on attendance_records(school_id, date, status);
create index if not exists idx_att_teacher_recent     on attendance_records(teacher_id, created_at desc);

-- =============================================================================
-- flags_issues
--   `resolved` kept (your spec); `status` adds the open/ack/resolved lifecycle.
-- =============================================================================
create table if not exists flags_issues (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  teacher_id  uuid references teachers(id) on delete set null,
  class_id    uuid references classes(id) on delete set null,
  issue_type  text not null,
  description text not null default '',
  status      flag_status not null default 'open',
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_flags_updated on flags_issues;
create trigger trg_flags_updated before update on flags_issues
  for each row execute function set_updated_at();
create index if not exists idx_flags_school_resolved on flags_issues(school_id, resolved);
create index if not exists idx_flags_school_recent   on flags_issues(school_id, created_at desc);

-- =============================================================================
-- activity_log  (ADDED — powers admin "Teacher activity log")
-- =============================================================================
create table if not exists activity_log (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  admin_id   uuid references admins(id) on delete set null,
  action     text not null,            -- 'login','mark_attendance','submit_week','raise_flag',...
  class_id   uuid references classes(id) on delete set null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_school_recent on activity_log(school_id, created_at desc);

-- =============================================================================
-- marking_presence  (ADDED — live "who's marking right now / which class")
--   Teacher client heartbeats (POST /api/presence) while a register is open;
--   admin monitor polls rows with last_seen_at within ~30s. One row per
--   teacher+class+day, refreshed on each heartbeat.
-- =============================================================================
create table if not exists marking_presence (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  teacher_id   uuid not null references teachers(id) on delete cascade,
  class_id     uuid not null references classes(id) on delete cascade,
  subject_id   uuid references subjects(id) on delete set null,
  date         date not null,
  session_id   text,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (school_id, teacher_id, class_id, date)
);
create index if not exists idx_presence_school_seen on marking_presence(school_id, last_seen_at desc);
