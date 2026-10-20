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
  event:=input_version || jsonb_build_object('createdBy',lower(trim(input_email)),'createdAt',now(),'cycleMonth',case when input_version->>'kind'='members' then coalesce(versions->-1->>'cycleMonth',to_char(effective,'YYYY-MM')) else to_char(effective,'YYYY-MM') end);
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
