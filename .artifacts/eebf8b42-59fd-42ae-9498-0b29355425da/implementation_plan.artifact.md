# Implementation Plan - Remember Me and Direct PDF Download

This plan outlines the changes required to implement a "Remember Me" feature on the login screen and modify the PDF download logic to store files directly in the system's Documents folder instead of prompting for sharing.

## User Review Required

> [!IMPORTANT]
> **Security Note**: The "Remember Me" feature will store the Employee ID and Password in `localStorage`. While convenient, this is less secure than using a specialized secure storage plugin. For a production app, I recommend adding `@capacitor/preferences` or a secure storage plugin. However, for the current request, I will proceed with `localStorage` as it's immediately available and works across web and mobile.

> [!NOTE]
> **PDF Download Location**: On Android/iOS, the PDF will be saved to the "Documents" directory. Users can find it using the "Files" app (Android) or "Files" app (iOS). This replaces the current behavior which opens a "Share" sheet.

## Proposed Changes

### 1. Login Page ("Remember Me")

#### [MODIFY] [LoginPage.jsx](file:///C:/Users/jeetu/OneDrive/Desktop/activities_app/ABSSTEM_ACTIVITIES_MOBILE_APP/src/pages/LoginPage.jsx)
- Add a "Remember Me" checkbox below the password field.
- Add `useEffect` to load saved credentials from `localStorage` on component mount.
- Update `handleLogin` to save credentials to `localStorage` if "Remember Me" is checked, or clear them if not.

### 2. PDF Download Hook

#### [MODIFY] [usePdf.js](file:///C:/Users/jeetu/OneDrive/Desktop/activities_app/ABSSTEM_ACTIVITIES_MOBILE_APP/src/hooks/usePdf.js)
- Change the storage directory from `Directory.Cache` to `Directory.Documents`.
- Remove the `Share.share` call to prevent the share dialog from appearing.
- Add a success message (toast or log) to confirm the file has been saved.
- Ensure the hook returns enough information for the calling component to show a confirmation toast.

## Verification Plan

### Automated Tests
- No automated tests are currently configured in the project, so verification will be manual.

### Manual Verification
1. **Remember Me**:
   - Open the login page.
   - Enter credentials and check "Remember Me".
   - Log in successfully.
   - Log out or refresh the app.
   - Verify that Employee ID and Password are pre-filled.
   - Try logging in with "Remember Me" unchecked and verify credentials are NOT pre-filled next time.

2. **PDF Download**:
   - Navigate to a page with a PDF download (e.g., Profile Page).
   - Click "Download Profile".
   - Verify that on a mobile device, no share sheet appears.
   - Verify that the PDF is saved to the device's Documents folder.
   - Verify that on the web, the standard browser download still works.
