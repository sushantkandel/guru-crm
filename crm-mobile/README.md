# Sales Guru Mobile

Compose Multiplatform Android + iOS app for [Sales Guru](../crm-app/).

## Features

- Login with email/password or **Sign in with Google** (Android)
- JWT session restore
- Dashboard stats
- Customers (list, create/edit with map picker, detail with map + Google Directions)
- Orders and payments (with filters)
- Map tab: shop markers, location filters, OSRM route polyline, external Google Maps navigation

## Prerequisites

- JDK 17+
- Android Studio (Ladybug or newer)
- Xcode 15+ (for iOS, Mac only)
- Running [crm-app backend](../crm-app/backend) on port **5001**

## Android flavors

| Flavor | App ID | API (default) | Use for |
|--------|--------|---------------|---------|
| **develop** | `com.gurucrm.mobile.develop` | `http://10.0.2.2:5001` | Local backend on emulator |
| **live** | `com.gurucrm.mobile` | `https://guru-crm.onrender.com` | Production API |

Both flavors can be installed side by side.

```bash
# Develop — local backend (auto adb reverse on install)
./gradlew :androidApp:installDevelopDebug

# Live — production API
./gradlew :androidApp:installLiveDebug
./gradlew :androidApp:assembleLiveRelease
```

Override API URLs in `crm-mobile/local.properties`:

```properties
api.base.url.develop=http://10.0.2.2:5001
api.base.url.live=https://guru-crm.onrender.com
```

On a **physical device** with develop, use your computer's LAN IP instead of `10.0.2.2`.

### iOS API URL

| Platform | Default |
|----------|---------|
| iOS simulator | `http://localhost:5001` (edit `Platform.ios.kt`) |

### Google sign-in (Android)

Uses the same **Web OAuth client ID** as the web app (`GOOGLE_CLIENT_ID` on Render).

1. [Google Cloud Console](https://console.cloud.google.com/) → **Credentials**
2. **Web client** — copy Client ID (used as server client ID)
3. **Android client(s)** — OAuth client with package name + SHA-1:
   - **live:** `com.gurucrm.mobile`
   - **develop:** `com.gurucrm.mobile.develop` (optional, for dev flavor Google sign-in)
4. Add to `crm-mobile/local.properties` and rebuild:

```properties
google.web.client.id=YOUR_ID.apps.googleusercontent.com
```

Get debug SHA-1:

```bash
cd crm-mobile && ./gradlew :androidApp:signingReport
```

## Run backend

```bash
cd ../crm-app/backend
npm run dev
```

## Run Android

```bash
cd crm-mobile
./gradlew :androidApp:installDevelopDebug   # local API
# or
./gradlew :androidApp:installLiveDebug      # production API
```

In Android Studio, choose the **develop** or **live** build variant from **Build → Select Build Variant**.

**Location:** The app requests location permission on launch so the Map tab can plot routes from your current position.

## Run iOS

1. Build the shared framework: `./gradlew :shared:embedAndSignAppleFrameworkForXcode`
2. Open `iosApp/iosApp.xcodeproj` in Xcode and run on a simulator.

iOS uses CoreLocation for GPS on the Map tab and customer map picker.



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

Use Android Studio: **Build → Generate Signed App Bundle / APK**, select the **live** flavor. Keystore credentials stay in the IDE — nothing signing-related belongs in project files.

For the **release SHA-1** (Google OAuth Android client), use `keytool -list -v` on your keystore, or Play Console after your first upload.
