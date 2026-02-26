alter table if exists enrollments
  add column if not exists schedule jsonb not null default '[]'::jsonb;

update enrollments
set schedule = '[]'::jsonb
where schedule is null;
