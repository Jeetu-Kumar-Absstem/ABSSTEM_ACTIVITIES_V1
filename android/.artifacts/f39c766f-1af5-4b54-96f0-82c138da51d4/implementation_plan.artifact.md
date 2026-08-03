# Implementation Plan - Update Mobile Sidebar (Drawer)

The goal is to update the mobile sidebar (drawer) to match the provided design image. This includes adding a user profile header, updating the "Events Calendar" icon to show today's date dynamically, adding carets (arrows) to menu items, and restyling the drawer to match the modern look in the image.

## User Review Required

> [!IMPORTANT]
> The "Events Calendar" icon will now dynamically show the current date (e.g., "JUL 29") instead of a static icon.

> [!NOTE]
> The sidebar icons will be updated to match the image as closely as possible using emojis and a custom component for the dynamic date.

## Proposed Changes

### [Web UI Components]

#### [MODIFY] [MobileDrawer.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/components/layout/MobileDrawer.jsx)
- Implement a `DynamicCalendarIcon` component.
- Update the drawer header to include:
    - User avatar (circular with initials).
    - Greeting: "Hello, [Name] 👋".
    - Role: e.g., "Game Master".
    - Redesigned close button (X) in a circular container.
- Update `PRIMARY` and `EVENTS` item lists with updated icons and the dynamic calendar icon.
- Update `DrawerItem` to include a `ChevronRight` caret on the right side.
- Add a footer section with version "v1.0.0" and "Secure & Protected" with a shield icon.
- Separate "Settings" and "Logout" into their own bottom section as shown in the image.

#### [MODIFY] [responsive.css](file:///C:/Users/jeetu/OneDrive/Desktop/activities%20app/ABSSTEM_ACTIVITIES_V1/src/styles/responsive.css)
- Update `.drawer-panel` styling (padding, background-color, border-radius).
- Update `.drawer-header` and `.drawer-title` to accommodate the new user profile layout.
- Add styles for `.drawer-user-info`, `.drawer-avatar`, and `.drawer-close-circle`.
- Style `.drawer-item` to match the image (spacing, active background, text color).
- Add styles for the `DynamicCalendarIcon` component.
- Style the new drawer footer and dividers.

## Verification Plan

### Manual Verification
- Open the app on a mobile device or in mobile emulation mode.
- Open the sidebar (drawer).
- Verify the header shows the user's name and initials correctly.
- Verify "Events Calendar" shows today's date (Month and Day).
- Verify all items have a caret (>) on the right.
- Verify the "Dashboard" item is active by default and has the blue background.
- Verify "Settings" and "Logout" are positioned at the bottom in their own containers.
- Check that the close (X) button works correctly.
