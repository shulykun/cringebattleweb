# Cringe Battle TWA

Trusted Web Activity wrapper for бойскринжем.рф

## Build

```bash
export ANDROID_HOME=/root/.bubblewrap/android_sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd twa-app
./gradlew assembleRelease
```

APK output: `app/build/outputs/apk/release/app-release.apk`

## Config

- **Package:** `ai.boiskrinzhem.twa`
- **URL:** `https://бойскринжем.рф/voice`
- **Keystore:** `twa-app/android.keystore` (alias: android, pass: android)

## Deploy to Play Store

1. Build AAB: `./gradlew bundleRelease`
2. Upload to Play Console
3. Update `assetlinks.json` with production signing key SHA-256
