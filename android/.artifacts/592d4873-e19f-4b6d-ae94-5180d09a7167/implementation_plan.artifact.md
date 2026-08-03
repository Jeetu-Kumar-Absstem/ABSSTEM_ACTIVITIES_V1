# Implementation Plan - Shrink App Icon

The user has provided a new `app_logo.png` (512x512) and requested to make the app icon appear slightly smaller on the device.

## User Review Required

> [!NOTE]
> I will use an **Inset Drawable** to add padding around the logo. This is the standard way to shrink the foreground of an adaptive icon without modifying the source image.
>
> I noticed the new `app_logo.png` has the logo positioned towards the top-left in the file itself. I will attempt to center it using a `gravity="center"` attribute, but for the best results, the source image should ideally have the logo centered in the 512x512 square.

## Proposed Changes

### Android Resources

#### [MODIFY] Mipmap Folders
* Re-copy the new `src/assets/app_logo.png` to all `ic_launcher_foreground.png` locations to ensure we are using the latest version.
* *Note: I will rename these to `ic_launcher_logo.png` to allow for an XML wrapper named `ic_launcher_foreground.xml`.*

#### [NEW] [ic_launcher_foreground.xml](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/android/app/src/main/res/drawable/ic_launcher_foreground.xml)
* Create a new XML drawable that insets the logo by ~15% to make it appear smaller and ensure it stays within the adaptive icon's "safe zone".

#### [MODIFY] [ic_launcher.xml](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml)
* Update the foreground reference from `@mipmap/ic_launcher_foreground` to `@drawable/ic_launcher_foreground`.

#### [MODIFY] [ic_launcher_round.xml](file:///C:/Users/HP/Desktop/aa app/ABSSTEM_ACTIVITIES_MOBILE_APP/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml)
* Update the foreground reference to `@drawable/ic_launcher_foreground`.

## Verification Plan

### Manual Verification
* Deploy to a device and verify the icon size on the home screen.
* Verify the logo is centered.
