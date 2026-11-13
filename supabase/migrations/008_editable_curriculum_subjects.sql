-- Editable curriculum fields are additive so existing subjects, enrollments and
-- prerequisite edges keep their identifiers and data.
alter table if exists subjects
  add column if not exists description text,
  add column if not exists term_order integer,
  add column if not exists evaluation_info text,
  add column if not exists notes text,
  add column if not exists useful_links jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '[]'::jsonb,
  add column if not exists deleted_at timestamptz;

-- Keep the current visible ordering as the deterministic initial order. Future
-- edits can change it without changing the subject identity or relationships.
with ranked as (
  select
    id,
    row_number() over (
      partition by term_suggested
      order by name asc, id asc
    )::integer as term_order
  from subjects
  where term_suggested is not null
)
update subjects as s
set term_order = ranked.term_order
from ranked
where s.id = ranked.id
  and s.term_order is null;

alter table if exists subjects
  drop constraint if exists subjects_term_order_non_negative,
  drop constraint if exists subjects_term_suggested_positive,
  drop constraint if exists subjects_useful_links_array,
  drop constraint if exists subjects_custom_fields_array;

alter table if exists subjects
  add constraint subjects_term_order_non_negative
    check (term_order is null or term_order >= 0),
  add constraint subjects_term_suggested_positive
    check (term_suggested is null or term_suggested > 0),
  add constraint subjects_useful_links_array
    check (jsonb_typeof(useful_links) = 'array'),
  add constraint subjects_custom_fields_array
    check (jsonb_typeof(custom_fields) = 'array');

create index if not exists subjects_active_order_idx
  on subjects(term_suggested asc nulls last, term_order asc nulls last, name asc)
  where deleted_at is null;

create index if not exists subjects_deleted_order_idx
  on subjects(deleted_at desc, term_suggested asc nulls last, term_order asc nulls last, name asc)
  where deleted_at is not null;

alter table if exists subject_prerequisites
  drop constraint if exists subject_prerequisites_no_self;

alter table if exists subject_prerequisites
  add constraint subject_prerequisites_no_self
    check (subject_id <> prerequisite_id);

-- A single directed edge table remains the source of truth. For a selected
-- subject, prerequisites are (subject_id, prerequisite_id), while unlocks are
-- represented by the reverse row (dependent_id, subject_id). Both sides are
-- replaced in one transaction and only active, existing subjects are accepted.
create or replace function public.replace_subject_relations(
  p_subject_id uuid,
  p_prerequisite_ids uuid[] default '{}'::uuid[],
  p_unlock_ids uuid[] default '{}'::uuid[]
)
returns table(subject_id uuid, prerequisite_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  prerequisite_ids uuid[] := coalesce(p_prerequisite_ids, '{}'::uuid[]);
  unlock_ids uuid[] := coalesce(p_unlock_ids, '{}'::uuid[]);
  requested_ids uuid[];
begin
  if not exists (
    select 1 from subjects
    where id = p_subject_id and deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'La materia no existe o está archivada.';
  end if;

  if p_subject_id = any(prerequisite_ids) or p_subject_id = any(unlock_ids) then
    raise exception using errcode = '23514', message = 'Una materia no puede requerirse a sí misma.';
  end if;

  select coalesce(array_agg(distinct relation_id), '{}'::uuid[])
    into requested_ids
  from unnest(prerequisite_ids || unlock_ids) as requested(relation_id);

  if exists (
    select 1
    from unnest(requested_ids) as requested(relation_id)
    where not exists (
      select 1 from subjects
      where id = requested.relation_id and deleted_at is null
    )
  ) then
    raise exception using errcode = '23503', message = 'Todas las materias relacionadas deben existir y estar activas.';
  end if;

  -- Keep edges touching archived counterparts. They remain hidden from the
  -- active editor but make restoration lossless.
  delete from subject_prerequisites as relation
  where (
      relation.subject_id = p_subject_id
      and exists (
        select 1 from subjects as counterpart
        where counterpart.id = relation.prerequisite_id
          and counterpart.deleted_at is null
      )
    )
    or (
      relation.prerequisite_id = p_subject_id
      and exists (
        select 1 from subjects as counterpart
        where counterpart.id = relation.subject_id
          and counterpart.deleted_at is null
      )
    );

  insert into subject_prerequisites(subject_id, prerequisite_id)
  select p_subject_id, prerequisite.relation_id
  from unnest(prerequisite_ids) as prerequisite(relation_id)
  union
  select unlock.relation_id, p_subject_id
  from unnest(unlock_ids) as unlock(relation_id);

  return query
    select relation.subject_id, relation.prerequisite_id
    from subject_prerequisites as relation
    join subjects as counterpart
      on counterpart.id = case
        when relation.subject_id = p_subject_id then relation.prerequisite_id
        else relation.subject_id
      end
     and counterpart.deleted_at is null
    where relation.subject_id = p_subject_id
       or relation.prerequisite_id = p_subject_id
    order by relation.subject_id, relation.prerequisite_id;
end;
$$;

revoke all on function public.replace_subject_relations(uuid, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.replace_subject_relations(uuid, uuid[], uuid[]) to service_role;
