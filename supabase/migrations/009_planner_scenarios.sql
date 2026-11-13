-- Planificar scenarios are additive. Existing planner_entries/planner_offers remain
-- available while clients roll forward and are copied into a first Plan A below.
create table if not exists planner_scenarios (
  id text primary key,
  term_id uuid not null references terms(id) on delete cascade,
  profile_key text not null default 'default',
  name text not null,
  position integer not null default 0,
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft', 'confirmed', 'archived')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_id, profile_key, name),
  check (position >= 0)
);

create index if not exists planner_scenarios_term_profile_idx
  on planner_scenarios(term_id, profile_key, lifecycle, position);

create table if not exists planner_selections (
  id text primary key,
  scenario_id text not null references planner_scenarios(id) on delete cascade,
  kind text not null default 'course' check (kind in ('course', 'personal')),
  subject_id uuid references subjects(id) on delete set null,
  enrollment_id uuid references enrollments(id) on delete set null,
  title text not null,
  code text,
  status_snapshot text,
  alignment text not null default 'unresolved'
    check (alignment in ('unresolved', 'linked', 'created', 'external')),
  color text,
  notes text,
  slots jsonb not null default '[]'::jsonb,
  source text not null default 'manual'
    check (source in ('enrollment', 'offer', 'manual', 'import', 'personal', 'legacy')),
  confirmed_enrollment_id uuid references enrollments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(slots) = 'array'),
  check (kind <> 'personal' or (subject_id is null and enrollment_id is null)),
  check (kind <> 'personal' or alignment = 'external')
);

create index if not exists planner_selections_scenario_idx
  on planner_selections(scenario_id, kind, created_at);
create index if not exists planner_selections_subject_idx
  on planner_selections(subject_id)
  where subject_id is not null;

create table if not exists planner_selection_offers (
  selection_id text not null references planner_selections(id) on delete cascade,
  offer_id text not null references planner_offers(id) on delete cascade,
  sort_order integer not null default 0,
  role text,
  primary key(selection_id, offer_id),
  check (sort_order >= 0)
);

create index if not exists planner_selection_offers_offer_idx
  on planner_selection_offers(offer_id, sort_order);

-- Every existing term/profile gets a deterministic first scenario. The
-- following inserts are intentionally idempotent for repeated deploys.
insert into planner_scenarios(id, term_id, profile_key, name, position, lifecycle)
select
  'planner-legacy-' || md5(legacy.term_id::text || ':' || legacy.profile_key),
  legacy.term_id,
  legacy.profile_key,
  'Plan A',
  0,
  'draft'
from (
  select id as term_id, 'default'::text as profile_key
  from terms
  union
  select distinct term_id, profile_key
  from planner_entries
  where term_id is not null
) as legacy
on conflict (term_id, profile_key, name) do nothing;

-- Copy old entries without destroying or changing them. Enrollment-backed rows
-- are already linked; imported/manual rows remain unresolved until confirmation.
insert into planner_selections(
  id, scenario_id, kind, subject_id, enrollment_id, title, code,
  status_snapshot, alignment, color, notes, slots, source
)
select
  entry.id,
  'planner-legacy-' || md5(entry.term_id::text || ':' || entry.profile_key),
  'course',
  entry.subject_id,
  entry.enrollment_id,
  entry.subject_name,
  entry.subject_code,
  entry.status,
  case when entry.source = 'enrollment' and entry.subject_id is not null then 'linked' else 'unresolved' end,
  entry.color,
  null,
  entry.slots,
  case
    when entry.source in ('enrollment', 'import') then entry.source
    else 'legacy'
  end
from planner_entries as entry
where entry.term_id is not null
on conflict (id) do nothing;

-- Preserve imported commission associations when the old entry has enough
-- identity to match the shared offer for its term.
insert into planner_selection_offers(selection_id, offer_id, sort_order)
select distinct
  entry.id,
  offer.id,
  0
from planner_entries as entry
join planner_scenarios as scenario
  on scenario.term_id = entry.term_id
 and scenario.profile_key = entry.profile_key
 and scenario.name = 'Plan A'
join planner_offers as offer
  on offer.term_id = entry.term_id
 and offer.profile_key = entry.profile_key
 and (entry.subject_code is null or offer.subject_code = entry.subject_code)
 and entry.commission_name is not null
 and offer.commission_name = entry.commission_name
where entry.term_id is not null
on conflict (selection_id, offer_id) do nothing;

-- A single directed edge table remains the source of truth for academic
-- prerequisites; this function only handles planner confirmation.
create or replace function public.confirm_planner_scenario(
  p_scenario_id text,
  p_profile_key text default 'default',
  p_alignments jsonb default '[]'::jsonb
)
returns table(selection_id text, enrollment_id uuid, alignment text)
language plpgsql
security definer
set search_path = public
as $$
declare
  scenario_row planner_scenarios%rowtype;
  selection_row planner_selections%rowtype;
  alignment_row jsonb;
  mode_value text;
  target_subject_id uuid;
  created_enrollment_id uuid;
  subject_name text;
  subject_code text;
  term_suggested integer;
  subject_type text;
begin
  select * into scenario_row
  from planner_scenarios
  where id = p_scenario_id and profile_key = p_profile_key
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'El escenario no existe.';
  end if;
  if scenario_row.lifecycle = 'archived' then
    raise exception using errcode = '55000', message = 'No se puede confirmar un escenario archivado.';
  end if;

  for selection_row in
    select * from planner_selections
    where scenario_id = p_scenario_id and kind = 'course'
    order by created_at, id
  loop
    select value into alignment_row
    from jsonb_array_elements(coalesce(p_alignments, '[]'::jsonb)) as value
    where value->>'selectionId' = selection_row.id
    limit 1;

    mode_value := coalesce(alignment_row->>'mode',
      case when selection_row.alignment in ('linked', 'created', 'external') then selection_row.alignment else null end);
    if mode_value is null then
      raise exception using errcode = '22023', message = 'Cada materia debe alinearse antes de confirmar.';
    end if;

    target_subject_id := null;
    if mode_value = 'linked' then
      if nullif(alignment_row->>'subjectId', '') is null and selection_row.alignment = 'linked' then
        target_subject_id := selection_row.subject_id;
      else
        begin
          target_subject_id := (alignment_row->>'subjectId')::uuid;
        exception when invalid_text_representation then
          raise exception using errcode = '22P02', message = 'La materia vinculada no es válida.';
        end;
      end if;
      if target_subject_id is null or not exists (
        select 1 from subjects where id = target_subject_id and deleted_at is null
      ) then
        raise exception using errcode = '23503', message = 'La materia vinculada no existe o está archivada.';
      end if;
    elsif mode_value = 'created' then
      -- Retrying a confirmation must reuse the subject created by the first
      -- successful attempt instead of inserting another row.
      if selection_row.alignment = 'created' and selection_row.subject_id is not null then
        target_subject_id := selection_row.subject_id;
        if not exists (select 1 from subjects where id = target_subject_id and deleted_at is null) then
          raise exception using errcode = '23503', message = 'La materia creada ya no existe o está archivada.';
        end if;
      else
        subject_name := coalesce(nullif(alignment_row->>'name', ''), selection_row.title);
        subject_code := nullif(alignment_row->>'code', '');
        term_suggested := null;
        if nullif(alignment_row->>'termSuggested', '') is not null then
          term_suggested := (alignment_row->>'termSuggested')::integer;
        end if;
        subject_type := nullif(alignment_row->>'type', '');
        if subject_code is not null and exists (select 1 from subjects where code = subject_code) then
          raise exception using errcode = '23505', message = 'El código de materia ya existe; vinculá la materia existente en lugar de crearla.';
        end if;
        insert into subjects(name, code, term_suggested, type)
        values (subject_name, subject_code, term_suggested, subject_type)
        returning id into target_subject_id;
      end if;
    elsif mode_value <> 'external' then
      raise exception using errcode = '22023', message = 'Alineación no soportada.';
    end if;

    if mode_value in ('linked', 'created') then
      insert into enrollments(term_id, subject_id, status, color, notes, schedule)
      values (scenario_row.term_id, target_subject_id, 'cursando', selection_row.color, selection_row.notes, selection_row.slots)
      on conflict (term_id, subject_id) do update
        set status = case
              when enrollments.status in ('aprobado', 'final_pendiente') then enrollments.status
              else excluded.status
            end,
            color = excluded.color,
            notes = excluded.notes,
            schedule = excluded.schedule
      returning id into created_enrollment_id;

      update planner_selections
      set subject_id = target_subject_id,
          alignment = mode_value,
          confirmed_enrollment_id = created_enrollment_id,
          updated_at = now()
      where id = selection_row.id;
    else
      created_enrollment_id := null;
      update planner_selections
      set subject_id = null,
          alignment = 'external',
          confirmed_enrollment_id = null,
          updated_at = now()
      where id = selection_row.id;
    end if;

    selection_id := selection_row.id;
    enrollment_id := created_enrollment_id;
    alignment := mode_value;
    return next;
  end loop;

  update planner_scenarios
  set lifecycle = 'confirmed', confirmed_at = now(), updated_at = now()
  where id = p_scenario_id;
end;
$$;

revoke all on function public.confirm_planner_scenario(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_planner_scenario(text, text, jsonb) to service_role;
