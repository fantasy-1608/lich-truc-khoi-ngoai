-- JSON roster versions live in the existing base row. No schedule month is
-- rewritten by applying a version. Existing editor access and CAS are preserved.
create or replace function public.rotation_doctors_for_date(input_day date, input_config jsonb, input_months jsonb)
returns text[] language plpgsql immutable security invoker set search_path = public as $$
declare
  base jsonb := input_config->'baseline';
  roster jsonb := base;
  versions jsonb := coalesce(input_config->'versions','[]');
  key text := to_char(input_day,'YYYY-MM-DD');
  month_data jsonb := coalesce(input_months->to_char(input_day,'YYYY-MM'),'{}');
  item jsonb; tour jsonb; doctor jsonb; names text[] := '{}';
  old_order text[]; new_order text[]; extended text[];
  anchor date; h jsonb; hs date; he date; hid text;
  phase integer; ix integer; next_ix integer; tour_id text; insertion integer;
begin
  for item in select value from jsonb_array_elements(versions) loop
    if (item->>'effectiveDate')::date <= input_day then roster := item->'roster'; end if;
  end loop;
  -- Manual name corrections remain valid; an ID override cannot shadow a snapshot.
  item := coalesce(month_data->'doctorOverrides'->key,roster->'holidaySchedule'->'doctorOverrides'->key,month_data->'scheduleSnapshots'->key->'doctors');
  if item is not null then
    select coalesce(array_agg(value),'{}') into names from jsonb_array_elements_text(item);
    return names;
  end if;
  select array_agg(value order by ordinal) into old_order from jsonb_array_elements_text(base->'tourOrder') with ordinality as a(value,ordinal);
  select array_agg(value order by ordinal) into new_order from jsonb_array_elements_text(roster->'tourOrder') with ordinality as a(value,ordinal);
  anchor := coalesce((base->>'rotationStartDate')::date,date '2025-11-01');
  if input_day < anchor then anchor := date '2025-11-01'; end if;
  if input_day < anchor then return '{}'; end if;
  phase := (input_day-anchor) % cardinality(old_order);
  h:=base->'holidaySchedule'; hs:=(h->>'startDate')::date; he:=(h->>'endDate')::date; hid:=h->>'holidayTourId';
  if hs is not null and he is not null and hid is not null and input_day>=hs then
    insertion:=greatest(0,least(coalesce((h->>'holidayInsertionIndex')::int,cardinality(old_order)),cardinality(old_order)));
    extended:=coalesce(old_order[1:insertion],'{}') || array[hid] || coalesce(old_order[insertion+1:cardinality(old_order)],'{}');
    ix:=array_position(extended,old_order[(((hs-anchor)%cardinality(old_order)+cardinality(old_order))%cardinality(old_order))+1])-1;
    if input_day<=he then
      tour_id:=extended[((ix+(input_day-hs))%cardinality(extended)+cardinality(extended))%cardinality(extended)+1];
      phase:=array_position(old_order,tour_id)-1;
    else
      next_ix:=((ix+(he-hs+1))%cardinality(extended)+cardinality(extended))%cardinality(extended)+1;
      if extended[next_ix]=hid then next_ix:=next_ix%cardinality(extended)+1; end if;
      phase:=(array_position(old_order,extended[next_ix])-1+(input_day-he-1))%cardinality(old_order);
    end if;
  end if;
  tour_id:=coalesce(month_data->'tourOverrides'->>key, case when phase is null then hid else new_order[phase+1] end);
  for tour in select value from jsonb_array_elements(roster->'tours') loop
    if tour->>'id'=tour_id then
      for item in select value from jsonb_array_elements(tour->'doctorIds') loop
        for doctor in select value from jsonb_array_elements(roster->'doctors') loop
          if doctor->>'id'=item#>>'{}' then names:=array_append(names,doctor->>'name'); exit; end if;
        end loop;
      end loop;
      exit;
    end if;
  end loop;
  return names;
end $$;
revoke all on function public.rotation_doctors_for_date(date,jsonb,jsonb) from public;
-- Pure JSON computation; no table access or privilege elevation.
grant execute on function public.rotation_doctors_for_date(date,jsonb,jsonb) to anon, authenticated;

create or replace function public.append_rotation_version_by_email(
  input_email text, input_baseline jsonb, input_version jsonb,
  expected_updated_at timestamptz, input_expected_months jsonb
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  saved public.schedule_base%rowtype; checked public.schedule_months%rowtype;
  config jsonb; versions jsonb; previous jsonb; proposed jsonb:=input_version->'roster'; event jsonb;
  effective date; earliest date; item record; tour jsonb; member jsonb;
  months jsonb:='{}'; new_config jsonb; stamp timestamptz;
  prior_order text[]; next_order text[]; pivot integer; partner integer; i integer;
  n integer; day date; prev_people text[]; people text[]; overlap text[];
begin
  if not coalesce(public.is_schedule_editor(input_email),false) then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into saved from public.schedule_base where id='default' for update;
  if not found or saved.updated_at is distinct from expected_updated_at then raise exception 'schedule_conflict' using errcode='P0001'; end if;
  config:=saved.data->'rotationConfig';
  if config is null then
    if input_baseline is distinct from jsonb_build_object('doctors',saved.data->'doctors','tours',saved.data->'tours','tourOrder',saved.data->'tourOrder','rotationStartDate',saved.data->'rotationStartDate','holidaySchedule',saved.data->'holidaySchedule') then
      raise exception 'baseline_changed' using errcode='P0001';
    end if;
    config:=jsonb_build_object('baseline',input_baseline,'versions','[]'::jsonb);
  end if;
  versions:=config->'versions'; previous:=coalesce(versions->-1->'roster',config->'baseline');
  if input_version->>'id' is null or length(input_version->>'id')>100 or exists(select 1 from jsonb_array_elements(versions) v where v->>'id'=input_version->>'id') then raise exception 'invalid_version_id'; end if;
  effective:=(input_version->>'effectiveDate')::date;
  earliest:=(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 month')::date;
  if effective is null or effective<earliest or (jsonb_array_length(versions)>0 and effective<=(versions->-1->>'effectiveDate')::date) then raise exception 'invalid_effective_date'; end if;
  if proposed->'rotationStartDate' is distinct from previous->'rotationStartDate' or proposed->'holidaySchedule' is distinct from previous->'holidaySchedule' then raise exception 'anchor_must_not_change'; end if;
  select array_agg(value order by ordinal) into prior_order from jsonb_array_elements_text(previous->'tourOrder') with ordinality a(value,ordinal);
  select array_agg(value order by ordinal) into next_order from jsonb_array_elements_text(proposed->'tourOrder') with ordinality a(value,ordinal);
  if cardinality(next_order)<>4 or (select count(distinct x) from unnest(next_order) x)<>4 then raise exception 'four_distinct_tours_required'; end if;
  if input_version->>'kind'='swap' then
    if proposed->'tours' is distinct from previous->'tours' or proposed->'doctors' is distinct from previous->'doctors' then raise exception 'swap_cannot_change_members'; end if;
    pivot:=array_position(prior_order,input_version->>'pivotTourId'); partner:=((pivot+2)%4)+1;
    if pivot is null or prior_order[partner] is distinct from input_version->>'partnerTourId' then raise exception 'invalid_swap_partner'; end if;
    for i in 1..4 loop
      if next_order[i] is distinct from prior_order[case when i=pivot then partner when i=partner then pivot else i end] then raise exception 'invalid_swap_order'; end if;
    end loop;
  elsif input_version->>'kind'='members' then
    if proposed->'tourOrder' is distinct from previous->'tourOrder' or proposed=previous then raise exception 'invalid_member_version'; end if;
  else raise exception 'invalid_version_kind'; end if;
  if (select count(distinct d->>'id') from jsonb_array_elements(proposed->'doctors') d) <> jsonb_array_length(proposed->'doctors') then raise exception 'duplicate_doctor_ids'; end if;
  if (select count(distinct t->>'id') from jsonb_array_elements(proposed->'tours') t) <> jsonb_array_length(proposed->'tours') then raise exception 'duplicate_tour_ids'; end if;
  for i in 1..4 loop
    select value into tour from jsonb_array_elements(proposed->'tours') where value->>'id'=next_order[i];
    if tour is null or jsonb_array_length(tour->'doctorIds')<4 or (select count(distinct value) from jsonb_array_elements_text(tour->'doctorIds'))<>jsonb_array_length(tour->'doctorIds') then raise exception 'invalid_tour_members'; end if;
    for member in select value from jsonb_array_elements(tour->'doctorIds') loop
      if not exists(select 1 from jsonb_array_elements(proposed->'doctors') d where d->>'id'=member#>>'{}' and length(trim(d->>'name'))>0) then raise exception 'invalid_doctor'; end if;
    end loop;
  end loop;
  -- Preview reads are guarded as well as the base. Read/lock months in stable order.
  if jsonb_typeof(input_expected_months)<>'object' then raise exception 'missing_preview_months'; end if;
  for n in -14..14 loop
    if not input_expected_months ? to_char(effective+n,'YYYY-MM') then raise exception 'incomplete_preview_months'; end if;
  end loop;
  for item in select key,value from jsonb_each(input_expected_months) order by key loop
    select * into checked from public.schedule_months where month=item.key for update;
    if checked.updated_at is distinct from (item.value#>>'{}')::timestamptz then raise exception 'schedule_conflict' using errcode='P0001'; end if;
    months:=months||jsonb_build_object(item.key,coalesce(checked.data,'{}'));
  end loop;
  event:=input_version || jsonb_build_object('createdBy',lower(trim(input_email)),'createdAt',now(),'cycleMonth',to_char(effective,'YYYY-MM'));
  if length(trim(coalesce(event->>'exceptionReason','')))>1000 then raise exception 'exception_reason_too_long'; end if;
  new_config:=config||jsonb_build_object('versions',versions||jsonb_build_array(event));
  -- Validate actual named assignments (snapshot/overrides included), not only IDs.
  for n in 0..14 loop
    day:=effective+n;
    people:=public.rotation_doctors_for_date(day,new_config,months);
    prev_people:=public.rotation_doctors_for_date(day-1,new_config,months);
    select array_agg(a) into overlap from unnest(people) a where exists(select 1 from unnest(prev_people) b where lower(trim(a))=lower(trim(b)));
    if cardinality(overlap)>0 and length(trim(coalesce(event->>'exceptionReason','')))=0 then raise exception 'consecutive_duty_requires_exception' using errcode='P0001'; end if;
  end loop;
  update public.schedule_base set data=saved.data||jsonb_build_object('rotationConfig',new_config) where id='default' returning updated_at into stamp;
  return stamp;
end $$;
revoke all on function public.append_rotation_version_by_email(text,jsonb,jsonb,timestamptz,jsonb) from public;
grant execute on function public.append_rotation_version_by_email(text,jsonb,jsonb,timestamptz,jsonb) to anon, authenticated;

-- Old clients must not keep changing the shared roster underneath frozen dates.
create or replace function public.save_schedule_base_if_current_by_email(input_email text,input_data jsonb,expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare current_data jsonb; stamp timestamptz; field text;
begin
  if not coalesce(public.is_schedule_editor(input_email),false) then raise exception 'not_authorized' using errcode='42501'; end if;
  select data into current_data from public.schedule_base where id='default' for update;
  if current_data is not null then
    foreach field in array array['doctors','tours','tourOrder','rotationStartDate','rotationConfig'] loop
      if input_data->field is distinct from current_data->field then raise exception 'use_versioned_rotation_settings' using errcode='P0001'; end if;
    end loop;
    if current_data ? 'rotationConfig' and input_data->'holidaySchedule' is distinct from current_data->'holidaySchedule' then raise exception 'holiday_requires_versioned_configuration' using errcode='P0001'; end if;
  end if;
  if expected_updated_at is null then
    insert into public.schedule_base(id,data) values('default',input_data) on conflict(id) do nothing returning updated_at into stamp;
  else update public.schedule_base set data=input_data where id='default' and updated_at=expected_updated_at returning updated_at into stamp; end if;
  if stamp is null then raise exception 'schedule_conflict' using errcode='P0001'; end if;
  return stamp;
end $$;

create or replace function public.save_schedule_month_if_current_by_email(input_email text,input_month text,input_data jsonb,expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path=public as $$
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
