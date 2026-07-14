-- 19_grants.sql
-- Grants missing from the initial migration set.
-- Run this in Supabase SQL Editor, OR include it in your models folder
-- when migrating to a self-hosted / cloud Postgres instance.
--
-- What this fixes:
--   403 on leaderboard_apply RPC — authenticated users (non-admin) were
--   calling the function during tournament register/unregister but lacked
--   EXECUTE permission, causing the leaderboard point award to silently fail.

-- Allow any logged-in user to call leaderboard_apply().
-- The function itself is SECURITY DEFINER so it runs with elevated rights;
-- this grant only allows users to invoke it, not bypass its internal logic.
GRANT EXECUTE ON FUNCTION public.leaderboard_apply TO authenticated;

-- Also grant execute on the helper functions used by RLS policies,
-- so they work correctly for all authenticated users.
GRANT EXECUTE ON FUNCTION public.app_current_emp_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_admin TO authenticated;