-- Restore standard schedule freeze guard now that November 2026 edits are finalized.
-- November 2026 and all earlier months are frozen; December 2026+ remain open for scheduling.
create or replace function public.save_schedule_month_if_current_by_email(
  input_email text,
  input_month text,
  input_data jsonb,
  expected_updated_at timestamptz
)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare current_data jsonb; stamp timestamptz;
begin
  if not coalesce(public.is_schedule_editor(input_email),false) then raise exception 'not_authorized' using errcode='42501'; end if;
  if input_month !~ '^\d{4}-\d{2}$' then raise exception 'invalid_month'; end if;
  select data into current_data from public.schedule_months where month=input_month for update;
  if input_month < to_char(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 month','YYYY-MM') and input_data is distinct from current_data then
    raise exception 'frozen_month_requires_source_restore' using errcode='P0001';
  end if;
  if expected_updated_at is null then insert into public.schedule_months(month,data) values(input_month,input_data) on conflict(month) do nothing returning updated_at into stamp;
  else update public.schedule_months set data=input_data where month=input_month and updated_at=expected_updated_at returning updated_at into stamp; end if;
  if stamp is null then raise exception 'schedule_conflict' using errcode='P0001'; end if;
  return stamp;
end $$;
