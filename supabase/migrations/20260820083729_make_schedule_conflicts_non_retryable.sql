create or replace function public.save_schedule_base_if_current_by_email(
  input_email text,
  input_data jsonb,
  expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  saved_updated_at timestamptz;
begin
  if not public.is_schedule_editor(input_email) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if expected_updated_at is null then
    insert into public.schedule_base (id, data)
    values ('default', input_data)
    on conflict (id) do nothing
    returning updated_at into saved_updated_at;
  else
    update public.schedule_base
    set data = input_data
    where id = 'default'
      and updated_at = expected_updated_at
    returning updated_at into saved_updated_at;
  end if;

  if saved_updated_at is null then
    -- P0001 maps to a non-retryable HTTP 400 response. Do not use 40001 here:
    -- it means serialization_failure and can trigger transaction retries.
    raise exception 'schedule_conflict' using errcode = 'P0001';
  end if;

  return saved_updated_at;
end;
$function$;

create or replace function public.save_schedule_month_if_current_by_email(
  input_email text,
  input_month text,
  input_data jsonb,
  expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  saved_updated_at timestamptz;
begin
  if not public.is_schedule_editor(input_email) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if input_month !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid_month' using errcode = '22023';
  end if;

  if expected_updated_at is null then
    insert into public.schedule_months (month, data)
    values (input_month, input_data)
    on conflict (month) do nothing
    returning updated_at into saved_updated_at;
  else
    update public.schedule_months
    set data = input_data
    where month = input_month
      and updated_at = expected_updated_at
    returning updated_at into saved_updated_at;
  end if;

  if saved_updated_at is null then
    -- See the base-save function above: conflicts are application errors,
    -- not retryable transaction failures.
    raise exception 'schedule_conflict' using errcode = 'P0001';
  end if;

  return saved_updated_at;
end;
$function$;
