-- School-wide group chat (one room per school). Idempotent.
create table if not exists group_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  sender_id   uuid not null,
  sender_name text not null,
  sender_role text not null check (sender_role in ('teacher','admin')),
  message     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_group_chat_school on group_chat_messages(school_id, created_at);
