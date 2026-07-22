-- Migration 009: Certificate log table
-- Stores a lightweight record each time a certificate PDF is generated.
-- No PDFs are stored — this is purely an audit/re-download index.

create table if not exists certificate_log (
  id              bigint generated always as identity primary key,
  employee_id     text        not null,          -- employee_code of certificate recipient
  tournament_id   bigint      not null references tournaments(id) on delete cascade,
  position        int         not null,           -- 1 = 1st, 2 = 2nd, 3 = 3rd …
  issued_at       timestamptz not null default now(),
  issued_by       text        not null            -- employee_code of the person who clicked Download
);

-- Index for fast per-employee lookups (ProfilePage query)
create index if not exists idx_certificate_log_employee_id
  on certificate_log (employee_id);

-- RLS: employees can read their own rows; admins can read all
alter table certificate_log enable row level security;

create policy "own certificates readable"
  on certificate_log for select
  using (
    employee_id = (select auth.jwt() -> 'user_metadata' ->> 'emp_id')
    or (select auth.role()) = 'service_role'
  );

-- Anyone authenticated can insert (the hook runs client-side as the user)
create policy "authenticated can log certificates"
  on certificate_log for insert
  with check ((select auth.role()) = 'authenticated');