create extension if not exists pgcrypto;

create type channel_type as enum ('public', 'private', 'direct');

create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  type channel_type not null default 'public',
  description text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, name)
);

create table chat_channel_members (
  channel_id uuid not null references chat_channels(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  last_read_message_id uuid,
  primary key (channel_id, user_id)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  author_id uuid not null,
  body text not null default '',
  thread_root_id uuid references chat_messages(id) on delete cascade,
  code_language text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint chat_message_has_content check (length(trim(body)) > 0 or deleted_at is not null)
);

create table chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  object_key text not null,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  created_at timestamptz not null default now()
);

create table chat_reactions (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table chat_message_mentions (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table chat_message_reads (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index chat_messages_channel_created_idx on chat_messages(channel_id, created_at desc);
create index chat_messages_thread_idx on chat_messages(thread_root_id, created_at asc);
create index chat_mentions_user_created_idx on chat_message_mentions(user_id, created_at desc);
create index chat_reads_message_idx on chat_message_reads(message_id);
create index chat_channels_workspace_idx on chat_channels(workspace_id, archived_at);

insert into chat_channels (workspace_id, name, type, description, created_by)
select '00000000-0000-0000-0000-000000000001', 'general', 'public', 'Company-wide conversation', '00000000-0000-0000-0000-000000000002'
where not exists (
  select 1 from chat_channels where workspace_id = '00000000-0000-0000-0000-000000000001' and name = 'general'
);
