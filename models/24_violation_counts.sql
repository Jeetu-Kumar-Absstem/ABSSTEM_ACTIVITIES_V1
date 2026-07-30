-- View to track violation counts per employee
create or replace view public.violation_counts as
select
  employee_id,
  employee,
  count(*) as total_violations,
  max(created_at) as last_violation_at
from public.violations
group by employee_id, employee;

-- Optional: Table for caching if needed (but view is usually enough)
-- create table if not exists public.violation_summary (
--   employee_id text primary key,
--   total_violations int default 0,
--   last_violation_at timestamptz
-- );
