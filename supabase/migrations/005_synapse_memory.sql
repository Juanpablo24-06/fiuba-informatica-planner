create table if not exists ai_memories (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  content text not null,
  category text not null default 'general',
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  confidence real,
  source_thread_id uuid references chat_threads(id) on delete set null,
  source_excerpt text,
  mem0_id text,
  metadata jsonb not null default '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_memories_owner_content_active_idx
  on ai_memories (owner_key, lower(content))
  where status = 'active';

create unique index if not exists ai_memories_mem0_id_idx
  on ai_memories (mem0_id)
  where mem0_id is not null;

create index if not exists ai_memories_owner_status_updated_idx
  on ai_memories (owner_key, status, updated_at desc);

create table if not exists ai_memory_revisions (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  snapshot jsonb not null default '[]'::jsonb,
  reason text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists ai_memory_revisions_owner_created_idx
  on ai_memory_revisions (owner_key, created_at desc);

alter table ai_memories enable row level security;
alter table ai_memory_revisions enable row level security;
