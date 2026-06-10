create or replace function public.get_shift_request_counts()
returns table(date date, pending_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select sr.date, count(*) as pending_count
  from public.shift_requests sr
  where sr.status in ('pending', 'in_review')
  group by sr.date
  order by sr.date;
$$;

grant execute on function public.get_shift_request_counts() to anon, authenticated;
