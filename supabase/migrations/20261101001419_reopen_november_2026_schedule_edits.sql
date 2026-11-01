-- Reopen only November 2026 day assignments until December 1 (Vietnam time).
-- Preserve editor verification, optimistic concurrency, and all other frozen months.
do $migration$
declare
  definition text;
  original_guard text := 'and input_data is distinct from current_data then';
  reopened_guard text := $guard$and not (
    input_month = '2026-11'
    and to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM') = '2026-11'
  ) and input_data is distinct from current_data then$guard$;
begin
  definition := pg_get_functiondef(
    'public.save_schedule_month_if_current_by_email(text,text,jsonb,timestamptz)'::regprocedure
  );
  if strpos(definition, original_guard) = 0 then
    raise exception 'schedule_freeze_guard_not_found';
  end if;
  execute replace(definition, original_guard, reopened_guard);
end
$migration$;
