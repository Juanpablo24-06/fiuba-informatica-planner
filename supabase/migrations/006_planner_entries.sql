create table if not exists planner_entries (
  id text primary key,
  profile_key text not null default 'default',
  term_id uuid references terms(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  subject_name text not null,
  subject_code text,
  color text,
  status text not null default 'planned',
  effective_from date not null,
  effective_to date,
  slots jsonb not null default '[]'::jsonb,
  source text not null default 'enrollment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_entries_dates check (effective_to is null or effective_to >= effective_from)
);

create index if not exists planner_entries_term_profile_idx on planner_entries(term_id, profile_key);
