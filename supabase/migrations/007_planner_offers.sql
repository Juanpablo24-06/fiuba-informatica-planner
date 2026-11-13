alter table if exists planner_entries
  add column if not exists commission_name text,
  add column if not exists teachers jsonb not null default '[]'::jsonb;

create table if not exists planner_offers (
  id text primary key,
  profile_key text not null default 'default',
  term_id uuid not null references terms(id) on delete cascade,
  subject_code text,
  activity text not null,
  commission_name text not null,
  shift text,
  capacity text,
  instance text,
  location text,
  teachers jsonb not null default '[]'::jsonb,
  slots jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists planner_offers_term_profile_idx on planner_offers(term_id, profile_key);
