-- Adds teacher↔admin direct messaging. Idempotent; safe to re-run.
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
