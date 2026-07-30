# Walkthrough - Horizontal Scrolling Fixes for Tournaments Page

Fixed horizontal scrolling issues in several sections of the `TournamentsPage.jsx` file to ensure content is accessible on mobile devices and small screens.

## Changes Made

### 1. Bracket / Fixtures
- Wrapped the bracket grid in a scroll container with `overflowX: 'auto'`, `width: '100%'`, and `display: 'block'`.
- Ensured both the Knockout bracket and the Round-Robin fixtures have a sufficient `minWidth` to prevent content squishing and force horizontal scrolling when needed.

### 2. Registered Participants
- Added horizontal scrolling to the participants table by wrapping it and setting a `minWidth` of `800px`.

### 3. Match Results
- Added horizontal scrolling to the match records table with a `minWidth` of `1000px`.

### 4. Final Results
- **Podium**: Wrapped the podium in a scroll container with a `minWidth` of `600px`.
- **Rank Table**: Added horizontal scrolling with a `minWidth` of `900px`.
- **Participation Certificates Table**: Added horizontal scrolling with a `minWidth` of `700px`.

### 5. Active & Upcoming Tournaments
- Ensured the existing horizontal scroll container is robust by adding `width: '100%'` and `display: 'block'`.

## Verification Results

- [x] Bracket grid scrolls horizontally on small screens.
- [x] Registered Participants table scrolls horizontally.
- [x] Final Results tables and podium scroll horizontally.
- [x] No layout regressions observed in other sections.
- [x] Dropdowns remain functional and are not clipped by the cards.

> [!NOTE]
> The `overflow: visible !important` on `.clay-card` in CSS was causing containers to expand instead of scroll. By explicitly setting `width: 100%` and `display: block` on the scrollable wrappers, we successfully restored scrolling behavior.
