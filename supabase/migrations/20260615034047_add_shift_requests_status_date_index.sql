create index if not exists shift_requests_open_status_date_idx
  on public.shift_requests (status, date)
  where status in ('pending', 'in_review');
