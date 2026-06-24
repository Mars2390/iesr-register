-- The chat_messages table was created with a mismatched schema (sender_id/
-- sender_role/sender_name/message/read and NO conversation key). It is empty,
-- so we drop and recreate it to match the application's Drizzle schema:
-- one conversation per teacher, per-side read flags.
drop table if exists chat_messages;

create table chat_messages (
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
