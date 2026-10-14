# Plan: Add Schedule Feature to Events

The goal is to add a `schedules` feature to the `events` table, allowing multiple entries for event name, date, and time using a JSONB column.

## Research Findings

### 1. JSONB Usage for Multi-entry Lists
- `models\07_match_results.sql` uses JSONB arrays for `team_a_players` and `team_b_players` to store player information.
- It uses `jsonb_typeof(column) = 'array'` and `jsonb_array_length(column)` for validation.
- `models\notifications_schema.sql` uses JSONB for `device_info` (object) and `data` (object).
- `models\15_leaderboard.sql` passes a `jsonb` delta to `leaderboard_apply` function to update points.

### 2. Existing Table Structure (`models\10_events.sql`)
- The `events` table currently has `start_date`, `end_date`, `start_time`, and `end_time`.
- Adding a `schedules` column will allow for recurring or multi-day/time events.

### 3. Trigger and Function Patterns
- `public.touch_updated_at()` is used to update the `updated_at` timestamp via triggers (e.g., `set_events_updated_at`).
- `public.events_sync_status()` is a trigger function that automatically updates `event_status` based on dates.

### 4. Admin Permission Patterns
- `public.app_is_admin()` is the authoritative function to check if a user is an admin.
- RLS policies often use `using (app_is_admin())` or `with check (app_is_admin())` to restrict write access to admins (e.g., `games_admin_write`, `slots_admin_write`).

## Proposed Implementation

### SQL for `models\10_events.sql`
I propose adding a `schedules` column as a JSONB array.

```sql
alter table if exists public.events
  add column if not exists schedules jsonb not null default '[]'::jsonb;

-- Validation check to ensure it's always an array
alter table if exists public.events
  add check (jsonb_typeof(schedules) = 'array');
```

The JSON structure for each entry in the array would be:
`{ "event_name": "String", "date": "YYYY-MM-DD", "time": "HH:MM:SS" }`

### Admin Restriction
To ensure only admins can modify the schedules (or the event in general), I will propose an RLS policy for the `events` table. Currently, `models\10_events.sql` doesn't show the RLS policies, but they are likely in `models\09_rls.sql` or `models\17_rls.sql`. I need to verify the current RLS for `events`.

## Next Steps
1. Verify current RLS policies for the `events` table in `models\09_rls.sql` and `models\17_rls.sql`.
2. Finalize the SQL migration script.
3. Propose the RLS policy to restrict `schedules` updates to admins.
