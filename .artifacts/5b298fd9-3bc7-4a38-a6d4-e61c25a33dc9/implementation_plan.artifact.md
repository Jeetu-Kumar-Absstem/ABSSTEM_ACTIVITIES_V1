# Implementation Plan - Profile Page Redesign

Redesign the Profile Page to be modern, mobile-friendly, and dynamic while maintaining existing functionality.

## Proposed Changes

### [Component Name] ProfilePage.jsx

#### [MODIFY] [ProfilePage.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities_app/ABSSTEM_ACTIVITIES_MOBILE_APP/src/pages/ProfilePage.jsx)

- **Header Redesign**:
    - Add a stylized Avatar (initials or User icon from Lucide).
    - Improve layout for name and badges.
    - Make "Download Profile" more visually appealing.
- **Dynamic Game Selector**:
    - Replace the standard `<select>` with a horizontal pill-based selector for a more "app-like" feel on mobile.
- **Enhanced Stat Cards**:
    - Integrate Lucide icons into `StatCard`.
    - Improve card typography and spacing.
- **Improved Outcome Visualization**:
    - Redesign the "Outcome Split" chart area to be more modern.
- **Section Organization**:
    - Use clearer headings and better spacing between sections (Stats, Charts, Certificates).
- **Responsive Enhancements**:
    - Ensure all elements are optimized for touch targets and small screens.

## Verification Plan

### Manual Verification
- Deploy the app and navigate to the Profile page.
- Verify that the new design looks modern and works well on mobile.
- Test the game selector pills to ensure stats update correctly.
- Test "Download Profile" and "Download Certificate" buttons to ensure functionality is preserved.
- Verify both Light and Dark modes look good with the new design.
