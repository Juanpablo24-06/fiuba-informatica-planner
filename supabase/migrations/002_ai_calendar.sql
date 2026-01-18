create table if not exists calendar_events_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('google', 'internal')),
  provider_event_id text not null,
  title text,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text,
  updated_at_provider timestamptz,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source, provider_event_id)
);

create index if not exists calendar_events_raw_starts_at_idx on calendar_events_raw(starts_at);
create index if not exists calendar_events_raw_provider_event_id_idx on calendar_events_raw(provider_event_id);

create table if not exists calendar_event_enrichments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references calendar_events_raw(id) on delete cascade,
  kind text,
  subject_id uuid references subjects(id) on delete set null,
  instance text,
  priority integer,
  tags text[],
  confidence numeric(3,2),
  needs_review boolean default false,
  explanation_short text,
  model text,
  created_at timestamptz default now(),
  unique (event_id)
);

create index if not exists calendar_event_enrichments_event_id_idx on calendar_event_enrichments(event_id);

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_role text not null,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists chat_messages_thread_id_idx on chat_messages(thread_id);
