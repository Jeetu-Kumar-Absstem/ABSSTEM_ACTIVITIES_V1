-- Fix: Add DELETE policy for admins on notifications table

-- 1. Ensure the DELETE policy exists
drop policy if exists "Admins can delete notifications" on public.notifications;
create policy "Admins can delete notifications"
on public.notifications for delete
using (public.app_is_admin());

-- 2. Also add UPDATE policy just in case for future features
drop policy if exists "Admins can update notifications" on public.notifications;
create policy "Admins can update notifications"
on public.notifications for update
using (public.app_is_admin())
with check (public.app_is_admin());
