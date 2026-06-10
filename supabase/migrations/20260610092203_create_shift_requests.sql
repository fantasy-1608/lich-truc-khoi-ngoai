create table if not exists public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  request_type text not null check (request_type in ('off', 'swap', 'note')),
  requester_doctor_name text not null,
  target_date date,
  target_doctor_name text,
  message text not null check (char_length(message) <= 500),
  contact text,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'resolved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.shift_requests enable row level security;

create policy "Anyone can submit shift requests"
  on public.shift_requests
  for insert
  to anon, authenticated
  with check (status = 'pending');

create or replace function public.submit_shift_request(
  input_date date,
  input_request_type text,
  input_requester_doctor_name text,
  input_target_date date,
  input_target_doctor_name text,
  input_message text,
  input_contact text
)
returns public.shift_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  created_request public.shift_requests;
begin
  if input_request_type not in ('off', 'swap', 'note') then
    raise exception 'invalid request type';
  end if;

  if nullif(trim(input_requester_doctor_name), '') is null then
    raise exception 'requester doctor name is required';
  end if;

  if nullif(trim(input_message), '') is null or char_length(input_message) > 500 then
    raise exception 'message is required and must be 500 characters or fewer';
  end if;

  insert into public.shift_requests (
    date,
    request_type,
    requester_doctor_name,
    target_date,
    target_doctor_name,
    message,
    contact,
    status
  )
  values (
    input_date,
    input_request_type,
    trim(input_requester_doctor_name),
    input_target_date,
    nullif(trim(coalesce(input_target_doctor_name, '')), ''),
    trim(input_message),
    nullif(trim(coalesce(input_contact, '')), ''),
    'pending'
  )
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.get_shift_request_counts()
returns table(date date, pending_count bigint)
language sql
security invoker
stable
as $$
  select sr.date, count(*) as pending_count
  from public.shift_requests sr
  where sr.status in ('pending', 'in_review')
  group by sr.date
  order by sr.date;
$$;

create or replace function public.list_shift_requests_by_email(input_email text)
returns setof public.shift_requests
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_schedule_editor(input_email) then
    raise exception 'not allowed';
  end if;

  return query
  select *
  from public.shift_requests
  order by created_at desc;
end;
$$;

create or replace function public.review_shift_request_by_email(
  input_email text,
  input_id uuid,
  input_status text,
  input_review_note text
)
returns public.shift_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.shift_requests;
begin
  if not public.is_schedule_editor(input_email) then
    raise exception 'not allowed';
  end if;

  if input_status not in ('pending', 'in_review', 'resolved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.shift_requests
  set
    status = input_status,
    review_note = nullif(trim(coalesce(input_review_note, '')), ''),
    reviewed_at = now()
  where id = input_id
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'shift request not found';
  end if;

  return updated_request;
end;
$$;

grant execute on function public.get_shift_request_counts() to anon, authenticated;
grant execute on function public.submit_shift_request(date, text, text, date, text, text, text) to anon, authenticated;
grant execute on function public.list_shift_requests_by_email(text) to anon, authenticated;
grant execute on function public.review_shift_request_by_email(text, uuid, text, text) to anon, authenticated;
