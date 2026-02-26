update subjects
set type = 'cbc'
where cycle = 'cbc'
  and (
    type is null
    or btrim(type) = ''
    or lower(type) = 'obligatoria'
  );

update subjects
set cycle = 'cbc'
where lower(type) = 'cbc'
  and (cycle is null or btrim(cycle) = '');
