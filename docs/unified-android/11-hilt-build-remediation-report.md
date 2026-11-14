# 11 — HILT BUILD REMEDIATION & APK ASSEMBLY REPORT
## Hilt Compiler KSP Configuration & Android Debug Build Verification

**Author:** Senior Android Build Engineer, Kotlin Architect, Gradle Specialist  
**Target Branch:** `feature/unified-android-apk`  
**Date:** November 2026  

---

## 1. Confirmed Root Causes & Remediations

### A. Missing Hilt & Room Annotation Processors
During project evaluation of `:app`, the Gradle build initially failed with:
```
The Hilt Android Gradle plugin is applied but no com.google.dagger:hilt-compiler dependency was found.
```
- **Remediation**:
  - Integrated Kotlin Symbol Processing (`ksp = "2.0.21-1.0.28"`) matching Kotlin `2.0.21`.
  - Added `alias(libs.plugins.ksp)` in root `build.gradle.kts` and app `build.gradle.kts`.
  - Added `ksp(libs.hilt.compiler)` and `ksp(libs.androidx.room.compiler)` in app `build.gradle.kts`.

### B. Missing `gradle.properties` (`android.useAndroidX=true`)
During execution of task `:app:checkDebugAarMetadata`:
```
Configuration `:app:debugRuntimeClasspath` contains AndroidX dependencies, but the `android.useAndroidX` property is not enabled.
```
- **Remediation**:
  - Created `apps-mobile/nova-android/gradle.properties` with:
    ```properties
    org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
    android.useAndroidX=true
    android.nonTransitiveRClass=true
    ```

---

## 2. Files Modified

1. **`apps-mobile/nova-android/gradle/libs.versions.toml`**:
   - Added KSP version matching Kotlin `2.0.21`: `ksp = "2.0.21-1.0.28"`.
   - Registered plugin: `ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }`.
2. **`apps-mobile/nova-android/build.gradle.kts`**:
   - Added `alias(libs.plugins.ksp) apply false` to root plugin management block.
3. **`apps-mobile/nova-android/app/build.gradle.kts`**:
   - Applied `alias(libs.plugins.ksp)`.
   - Added compiler dependency: `ksp(libs.hilt.compiler)`.
   - Added Room compiler dependency: `ksp(libs.androidx.room.compiler)`.
4. **`.github/workflows/build-unified-apk.yml`**:
   - Standardized command to `./gradlew :app:assembleDebug --no-daemon --stacktrace`.

---

## 3. Dependency Configuration Before & After

| Layer | Before Remediation | After Remediation |
| :--- | :--- | :--- |
| **Annotation Processing** | None | Google KSP (`2.0.21-1.0.28`) |
| **Root Plugins** | AGP, Kotlin, Compose, Hilt, Google Services | Added `libs.plugins.ksp` |
| **App Plugins** | `android.application`, `kotlin.android`, `kotlin.compose`, `hilt.android` | Added `libs.plugins.ksp` |
| **Hilt Dependencies** | `implementation(libs.hilt.android)` | `implementation(libs.hilt.android)` + `ksp(libs.hilt.compiler)` |
| **Room Dependencies** | `implementation(libs.androidx.room.runtime)` | `implementation(...)` + `ksp(libs.androidx.room.compiler)` |

---

## 4. Verification & Build Command
- **Command:** `./gradlew :app:assembleDebug --stacktrace`
- **Output Target:** `app/build/outputs/apk/debug/app-debug.apk`
- **Application ID:** `com.nova.companion`
- **Target SDK:** 35 | **Min SDK:** 26
