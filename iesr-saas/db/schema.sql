-- =============================================================================
-- IESR SaaS — Neon Postgres schema (Neon HTTP-driver friendly)
-- No DO $$ blocks, no PL/pgSQL functions, no triggers, no ENUM types.
-- Status/day columns are TEXT + CHECK constraints. Every statement is a single,
-- simple command so Neon's single-statement-per-request HTTP driver accepts it.
-- Run:  npm run db:setup   (applies this file via scripts/run-sql.ts)
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- schools
create table if not exists schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- admins
create table if not exists admins (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  name           text not null default 'Administrator',
  pin_hash       text not null,
  pin_salt       text not null,
  pin_iterations integer not null default 100000,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_admins_school on admins(school_id) where active;

-- ---------------------------------------------------------------- classes
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
create index if not exists idx_classes_school on classes(school_id);

-- ---------------------------------------------------------------- students
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
create index if not exists idx_students_school on students(school_id);
create index if not exists idx_students_class  on students(class_id);

-- ---------------------------------------------------------------- teachers
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
create index if not exists idx_teachers_school    on teachers(school_id) where active;
create index if not exists idx_teachers_class_ids on teachers using gin (class_ids);

-- ---------------------------------------------------------------- subjects
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
create index if not exists idx_subjects_school on subjects(school_id);
create index if not exists idx_subjects_class  on subjects(class_id);

-- ---------------------------------------------------------------- timetables
create table if not exists timetables (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  day        text not null check (day in ('mon','tue','wed','thu','fri','sat','sun')),
  start_time time not null,
  end_time   time not null,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_timetables_school    on timetables(school_id);
create index if not exists idx_timetables_class_day on timetables(class_id, day);

-- ---------------------------------------------------------------- attendance_records
create table if not exists attendance_records (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  date       date not null,
  session_id text not null,
  subject_id uuid references subjects(id) on delete set null,
  status     text not null default 'unmarked' check (status in ('present','absent','late','unmarked')),
  teacher_id uuid references teachers(id) on delete set null,
  tags       jsonb not null default '[]'::jsonb,
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, date, session_id)
);
create index if not exists idx_att_school_class_date on attendance_records(school_id, class_id, date);
create index if not exists idx_att_school_date_status on attendance_records(school_id, date, status);
create index if not exists idx_att_teacher_recent     on attendance_records(teacher_id, created_at desc);

-- ---------------------------------------------------------------- flags_issues
create table if not exists flags_issues (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  teacher_id  uuid references teachers(id) on delete set null,
  class_id    uuid references classes(id) on delete set null,
  issue_type  text not null,
  description text not null default '',
  status      text not null default 'open' check (status in ('open','acknowledged','resolved')),
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_flags_school_resolved on flags_issues(school_id, resolved);
create index if not exists idx_flags_school_recent   on flags_issues(school_id, created_at desc);

-- ---------------------------------------------------------------- activity_log
create table if not exists activity_log (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  admin_id   uuid references admins(id) on delete set null,
  action     text not null,
  class_id   uuid references classes(id) on delete set null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_school_recent on activity_log(school_id, created_at desc);

-- ---------------------------------------------------------------- marking_presence
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

-- ---------------------------------------------------------------- chat_messages
create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  teacher_id      uuid not null references teachers(id) on delete cascade,
  sender          text not null check (sender in ('teacher','admin')),
  body            text not null,
  read_by_admin   boolean not null default false,
  read_by_teacher boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_chat_school_teacher on chat_messages(school_id, teacher_id, created_at);
