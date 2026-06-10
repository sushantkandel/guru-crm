# Sales Guru Mobile

Compose Multiplatform Android + iOS app for [Sales Guru](../crm-app/).

## Features

- Login with JWT session restore
- Dashboard stats
- Customers (list, create/edit with map picker, detail with map + Google Directions)
- Orders and payments (with filters)
- Map tab: shop markers, location filters, OSRM route polyline, external Google Maps navigation

## Prerequisites

- JDK 17+
- Android Studio (Ladybug or newer)
- Xcode 15+ (for iOS, Mac only)
- Running [crm-app backend](../crm-app/backend) on port **5001**

## API URL

| Platform | Default base URL |
|----------|------------------|
| Android emulator (debug) | `http://10.0.2.2:5001` |
| Android release | `https://api.gurucrm.example.com` (edit `shared/build.gradle.kts`) |
| iOS simulator | `http://localhost:5001` (edit `Platform.ios.kt`) |

To override the Android debug URL, change `buildConfigField` in `shared/build.gradle.kts` under `defaultConfig` / `release`.

## Run backend

```bash
cd ../crm-app/backend
npm run dev
```

## Run Android

```bash
cd crm-mobile
./gradlew :androidApp:assembleDebug
```

Install the APK from `androidApp/build/outputs/apk/debug/androidApp-debug.apk`, or open `androidApp` in Android Studio and run on an emulator.

**Location:** The app requests location permission on launch so the Map tab can plot routes from your current position.

## Run iOS

1. Build the shared framework: `./gradlew :shared:embedAndSignAppleFrameworkForXcode`
2. Open `iosApp/iosApp.xcodeproj` in Xcode and run on a simulator.

iOS uses CoreLocation for GPS on the Map tab and customer map picker.

## Demo login

- `admin@crm.com` / `admin123`

## Project structure

```
crm-mobile/
  androidApp/     Android application shell
  shared/         KMP shared code (UI + API + OSM WebView maps)
  iosApp/         Xcode wrapper
  .github/        CI (assembleDebug on push)
```

Package: `com.gurucrm.mobile`

## Release builds

```bash
# Debug (local API)
./gradlew :androidApp:assembleDebug

# Release (set production API_BASE_URL in shared/build.gradle.kts first)
./gradlew :androidApp:assembleRelease
```

Sign release builds in Android Studio or configure signing in `androidApp/build.gradle.kts` before Play Store upload.
