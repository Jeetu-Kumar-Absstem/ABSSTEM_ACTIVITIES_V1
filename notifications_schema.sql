-- Phase 1: Database Setup for Push Notifications

-- Device Tokens for multiple devices per user
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  device_info jsonb default '{}'::jsonb,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Notification History (Global)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  target_type text not null, -- 'all', 'employees', 'admins', 'company', 'tournament'
  target_id text, -- optional ID for company/tournament
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Delivery logs and user-specific view state
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'sent', -- 'sent', 'delivered', 'opened', 'deleted'
  updated_at timestamptz default now()
);

-- RLS for device_tokens
alter table public.device_tokens enable row level security;

create policy "Users can view their own tokens"
on public.device_tokens for select
using (auth.uid() = user_id);

create policy "Users can insert their own tokens"
on public.device_tokens for insert
with check (auth.uid() = user_id);

create policy "Users can update their own tokens"
on public.device_tokens for update
using (auth.uid() = user_id);

create policy "Users can delete their own tokens"
on public.device_tokens for delete
using (auth.uid() = user_id);

-- RLS for notifications
alter table public.notifications enable row level security;

create policy "All authenticated users can view notifications"
on public.notifications for select
using (auth.role() = 'authenticated');

create policy "Admins can insert notifications"
on public.notifications for insert
with check (public.app_is_admin());

-- RLS for notification_logs
alter table public.notification_logs enable row level security;

create policy "Users can view their own logs"
on public.notification_logs for select
using (auth.uid() = user_id);

create policy "Users can update their own logs"
on public.notification_logs for update
using (auth.uid() = user_id);

create policy "Users can delete their own logs (mark as deleted)"
on public.notification_logs for delete
using (auth.uid() = user_id);
