-- Allow append-only member corrections at the latest effective date.
-- Preserve the deployed function body, privileges, locks and all other validation.
do $migration$
declare
  definition text;
  old_guard text := 'effective<=(versions->-1->>''effectiveDate'')::date';
  new_guard text := '(effective<(versions->-1->>''effectiveDate'')::date or (effective=(versions->-1->>''effectiveDate'')::date and input_version->>''kind'' is distinct from ''members''))';
begin
  definition := pg_get_functiondef('public.append_rotation_version_by_email(text,jsonb,jsonb,timestamptz,jsonb)'::regprocedure);
  if strpos(definition, old_guard) = 0 then
    raise exception 'Unexpected rotation date guard; migration aborted';
  end if;
  execute replace(definition, old_guard, new_guard);
end $migration$;
