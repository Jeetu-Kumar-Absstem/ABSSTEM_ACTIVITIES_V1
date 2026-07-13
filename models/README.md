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
1. `10_events.sql`              — events (upcoming / past)
1. `11_tournaments.sql`         — tournament master
1. `12_tournament_participants.sql`
1. `13_tournament_matches.sql`  — bracket / fixtures / match results
1. `14_final_results.sql`       — podium rows after a tournament ends
1. `15_leaderboard.sql`         — materialised activity points
1. `16_views.sql`               — upcoming / past / active / leaderboard / hall of fame views
1. `17_rls.sql`                 — row-level security for the new tables
1. `18_admins.sql`              — admin allow-list (drives `app_is_admin()`)

Notes:
- The root [schema.sql](../schema.sql) still exists as the full combined script.
- All files use `create if not exists` and `drop if exists` where needed so they can be reapplied.
- The Events / Tournaments / Leaderboard tables are intentionally decoupled from
  `bookings` and `match_results` for now — we'll wire cross-links (e.g. event → tournament
  → match_result) in a later pass.
