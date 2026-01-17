create extension if not exists "pgcrypto";

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  credits integer,
  weekly_hours integer,
  total_hours integer,
  term_suggested integer,
  cycle text,
  type text,
  requirements text[],
  template jsonb,
  created_at timestamptz default now()
);

create table if not exists subject_prerequisites (
  subject_id uuid not null references subjects(id) on delete cascade,
  prerequisite_id uuid not null references subjects(id) on delete cascade,
  primary key (subject_id, prerequisite_id)
);

create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date,
  end_date date,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  status text not null check (status in ('cursando', 'final_pendiente', 'aprobado', 'recursar')),
  color text,
  notes text,
  created_at timestamptz default now(),
  unique(term_id, subject_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  type text not null check (type in ('parcial', 'recuperatorio', 'tp', 'defensa', 'final', 'clase', 'otro')),
  title text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text,
  grade numeric(3,1),
  attempt integer default 1,
  links jsonb,
  created_at timestamptz default now()
);

create table if not exists calendar_sources (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null unique,
  timezone text default 'America/Argentina/Buenos_Aires',
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
