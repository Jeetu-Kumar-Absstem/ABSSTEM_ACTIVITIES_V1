-- Migration: Add user_id to employees table and update trigger

-- 1. Add user_id column
alter table if exists public.employees
add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Update the handle_new_employee_profile function to populate user_id
create or replace function public.handle_new_employee_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_code text := upper(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'emp_id'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'employee_code'), '')
    )
  );
  v_name text := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'name',
        new.raw_user_meta_data ->> 'full_name',
        split_part(coalesce(new.email, ''), '@', 1)
      )
    ),
    ''
  );
  v_department text := nullif(trim(new.raw_user_meta_data ->> 'department'), '');
begin
  if v_employee_code is null or v_employee_code = '' then
    raise exception 'Employee ID is required to create an account';
  end if;

  insert into public.employees (user_id, name, email, department, employee_code, is_active)
  values (
    new.id,
    coalesce(v_name, 'New User'),
    nullif(lower(coalesce(new.email, '')), ''),
    coalesce(v_department, 'General'),
    v_employee_code,
    true
  )
  on conflict (employee_code) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    email = excluded.email,
    department = excluded.department,
    is_active = true,
    updated_at = now();

  return new;
end;
$$;

-- 3. Backfill existing employees with user_id from auth.users based on employee_code
-- This is a bit complex as we need to parse the JSONB metadata in auth.users
update public.employees e
set user_id = u.id
from auth.users u
where e.user_id is null
  and upper(
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'emp_id'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'employee_code'), '')
    )
  ) = upper(e.employee_code);
