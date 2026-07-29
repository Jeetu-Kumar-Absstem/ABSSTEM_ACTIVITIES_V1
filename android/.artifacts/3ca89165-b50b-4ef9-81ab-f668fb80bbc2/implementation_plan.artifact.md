# Update Events Calendar Icon to Dynamic Date

This plan updates the "Events Calendar" icon in the mobile sidebar (and other relevant parts of the app) to use a dynamic calendar icon showing the current date instead of a static emoji.

## User Review Required

> [!NOTE]
> The dynamic calendar icon will always show the current local date of the user's device.

## Proposed Changes

### UI Components

#### [MODIFY] [MobileDrawer.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/components/layout/MobileDrawer.jsx)
- Import `CalendarIcon` from `../common/CalendarIcon`.
- Update `EVENTS` array: change `icon: '📅'` to `icon: <CalendarIcon size="20px" />`.

#### [MODIFY] [Sidebar.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/components/layout/Sidebar.jsx)
- Import `CalendarIcon` from `../common/CalendarIcon`.
- Update the "Events" group icon: change `icon="🎉"` to `icon={<CalendarIcon size="18px" />}`.

#### [MODIFY] [EventsTopBar.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/components/events/EventsTopBar.jsx)
- Import `CalendarIcon` from `../common/CalendarIcon`.
- Update `TABS` array: change `icon: '📅'` to `icon: <CalendarIcon size="18px" />`.

#### [MODIFY] [DashboardPage.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/pages/DashboardPage.jsx)
- Replace `icon="🎉"` with `icon={<CalendarIcon size="28px" date={currentDate} />}` for the "Events" QuickActionItem.

## Verification Plan

### Manual Verification
- Open the app on a mobile device (or mobile view).
- Open the mobile sidebar (drawer). Verify "Events Calendar" shows the dynamic date icon.
- Check the desktop sidebar. Verify "Events" shows the dynamic date icon.
- Navigate to the Events page. Verify the top tab bar shows the dynamic date icon for "Events Calendar".
- Check the Dashboard page. Verify the "Events" quick action shows the dynamic date icon.
