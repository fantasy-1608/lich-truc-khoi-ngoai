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
  if month_data->'tourOverrides' ? key then roster:=base; end if;
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


-- Capture the existing roster unchanged, before versioned edits become available.
update public.schedule_base set data=data||jsonb_build_object('rotationConfig',jsonb_build_object('baselineEffectiveDate',to_char(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 month','YYYY-MM-DD'),'baseline',jsonb_build_object('doctors',data->'doctors','tours',data->'tours','tourOrder',data->'tourOrder','rotationStartDate',data->'rotationStartDate','holidaySchedule',data->'holidaySchedule'),'versions','[]'::jsonb)) where id='default' and not data ? 'rotationConfig';
