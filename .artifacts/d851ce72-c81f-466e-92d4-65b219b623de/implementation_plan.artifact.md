# Implementation Plan - Production Push Notification System

This plan outlines the design and implementation of a robust Push Notification system using React, Capacitor, Supabase, and Firebase Cloud Messaging (FCM).

## User Review Required

> [!IMPORTANT]
> **Firebase Project Setup:** You will need to create a Firebase project and provide the `google-services.json` file.
> **Service Account Key:** You will need to generate a Firebase Service Account JSON key and add it to Supabase Edge Function secrets as `FIREBASE_SERVICE_ACCOUNT`.

## Proposed Changes

### 1. Database Schema (Supabase)

#### [NEW] `device_tokens` Table
- `id`: uuid (PK)
- `user_id`: uuid (FK -> auth.users)
- `token`: text (Unique FCM Token)
- `device_info`: jsonb (Platform, model, etc.)
- `last_seen_at`: timestamptz

#### [NEW] `notifications` Table
- `id`: uuid (PK)
- `title`: text
- `body`: text
- `data`: jsonb
- `target_type`: text (all, employees, admins, specific)
- `created_at`: timestamptz

#### [NEW] `notification_logs` Table
- `id`: uuid (PK)
- `notification_id`: uuid (FK)
- `user_id`: uuid (FK)
- `status`: text (sent, delivered, opened)

### 2. Backend (Supabase Edge Functions)

#### `push-notifications` Edge Function
- **POST `/register`**: Authenticated users register their FCM token.
- **POST `/send`**: Admin-only (verified via JWT and `app_is_admin()`) to send notifications.

### 3. Frontend (React & Capacitor)

#### [MODIFY] [CreateNotificationPage.jsx](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/src/pages/CreateNotificationPage.jsx)
- Add "Specific Employees" targeting option.
- Implement searchable employee list with multi-selection.
- Display selected employee count.

#### [MODIFY] [push-notifications Edge Function](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/supabase/functions/push-notifications/index.ts)
- Update `/send` logic to handle `selected_employee_ids`.
- Implement mapping of `employee_ids` to `user_ids` for token targeting.

#### [MODIFY] [schema.sql](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/schema.sql)
- Add `user_id` column to `public.employees` table for better integration with Auth and Notifications.
- Update `handle_new_employee_profile` trigger to populate `user_id`.

#### [MODIFY] `ProfileIcon.jsx`
- Insert "Notifications" link between "My Profile" and "Settings".

#### [MODIFY] `AdminPage.jsx`
- Add "Push Notifications" tab with a button to open the creation form.

#### [MODIFY] `ActivityPlanner.jsx` & `AppContext.jsx`
- Integrate new tabs: `notifications` and `create-notification`.

### 4. Capacitor Integration
- Implement `usePushNotifications` hook to handle permissions and token registration on login.

## Verification Plan

### Automated Tests
- Test Edge Function authorization.
- Verify token de-duplication in `device_tokens`.

### Manual Verification
1. Log in on Android -> Verify token saved in DB.
2. Admin Panel -> Send notification to "All".
3. Check `NotificationsPage` -> Verify entry appears.
4. Click notification -> Verify app opens to `NotificationsPage`.
