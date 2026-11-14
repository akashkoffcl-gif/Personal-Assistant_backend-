# 06 — APK BUILD & TOOLCHAIN REPORT
## Build Environment Status & CI/CD Compilation Instructions

**Author:** Principal Release Engineer & DevOps Architect  
**Date:** November 2026  

---

## 1. Local Toolchain Audit

- **Operating System**: Windows 11 Enterprise (PowerShell)
- **Node.js**: v20+ / npm v10+ (Verified — Web build successful)
- **Android SDK & JDK Status**:
  - The local Windows host system currently does not have `java` / `javac` (JDK 17) or Android SDK Command-Line Tools registered in the global system `PATH`.
  - In accordance with **Strict Rule 14** (*"If a required dependency is missing, report the exact blocker. Do not claim a successful APK build without an actual generated APK"*), local APK generation requires installing OpenJDK 17 and Android SDK Tools, or delegating to the existing GitHub Actions CI workflow.

---

## 2. GitHub Actions Automated Build Pipeline

A dedicated automated workflow is established in `.github/workflows/build-unified-apk.yml`:
```yaml
name: Build Unified NOVA Android APK
on:
  push:
    branches: [ feature/unified-android-apk ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      - name: Build Debug APK
        run: |
          cd apps-mobile/nova-android
          chmod +x gradlew || gradle wrapper
          ./gradlew assembleDebug
      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: nova-unified-debug-apk
          path: apps-mobile/nova-android/app/build/outputs/apk/debug/*.apk
```

---

## 3. Local Command Reference (Once JDK 17 & Android SDK are installed)

```powershell
# 1. Set environment variables
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
$env:ANDROID_HOME = "C:\Users\<User>\AppData\Local\Android\Sdk"

# 2. Build Debug APK
cd D:\PT\apps-mobile\nova-android
gradle assembleDebug

# 3. Output APK location
# apps-mobile/nova-android/app/build/outputs/apk/debug/app-debug.apk
```
