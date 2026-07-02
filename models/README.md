# Models

Each file here is split by responsibility so you can maintain tables and RLS separately.

Recommended apply order:
1. `00_shared.sql`
1. `01_employees.sql`
1. `02_games.sql`
1. `03_slots.sql`
1. `04_bans.sql`
1. `05_rules.sql`
1. `06_bookings.sql`
1. `07_match_results.sql`
1. `07_violations.sql`
1. `08_views.sql`
1. `09_rls.sql`

Notes:
- The root [schema.sql](../schema.sql) still exists as the full combined script.
- All files use `create if not exists` and `drop if exists` where needed so they can be reapplied.
