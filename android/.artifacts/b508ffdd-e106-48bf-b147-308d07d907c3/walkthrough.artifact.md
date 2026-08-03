# Walkthrough: Fixed Horizontal Scrolling in Tournaments Page

I have implemented horizontal scrolling for various UI components on the Tournaments page to ensure full visibility on mobile devices.

## Changes Made

### Tournaments Page
- **Sub-tab Bar**: Updated the sub-navigation bar (Active Tournaments, Bracket, etc.) to scroll horizontally on small screens instead of wrapping.
- **Tables**: Added a `minWidth: 850px` to all tables. This ensures that columns have enough space to be legible, and triggers a horizontal scroll within their containers.
- **Match Grids**: Updated the fixture grid to be responsive using `auto-fill`, which prevents cards from being squashed on smaller screens.
- **Bracket Grid**: Ensured that the knockout bracket maintains a minimum width based on the number of rounds, allowing users to scroll through the entire tournament progression.

### Global Components
- **Events Top Bar**: Updated the top navigation bar (Events, Tournaments, Leaderboard) to allow horizontal scrolling on narrow viewports.

## Verification
- Verified that all table containers have `overflowX: 'auto'`.
- Verified that the `subTabBar` and `EventsTopBar` have `whiteSpace: 'nowrap'` and `overflowX: 'auto'` to enable scrolling.
- Verified that `flexShrink: 0` is applied to tab buttons to prevent them from squashing.
