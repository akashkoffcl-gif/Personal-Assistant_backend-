# 09 — INSTALLATION & MIGRATION GUIDE
## Transitioning to the Unified Single-APK Application

**Author:** Staff Release Engineer  
**Date:** November 2026  

---

## 1. Migration for Existing Users

1. **Uninstall Previous Companion**:
   - If the previous `nova-companion-debug.apk` is installed, uninstall it from *Settings > Apps > NOVA Companion* or execute:
     ```bash
     adb uninstall com.nova.companion
     ```
2. **Remove PWA Shortcut**:
   - If the Chrome PWA shortcut was added to the home screen, remove the icon to avoid confusion.
3. **Install Unified APK**:
   ```bash
   adb install -r nova-unified-release.apk
   ```

---

## 2. First-Launch Setup Checklist

1. Launch **NOVA JARVIS** from the launcher.
2. Log in using your existing NOVA email and password.
3. On prompt, grant **Audio / Microphone** permission for voice interactions.
4. Navigate to **Notification Center > Preferences** and click **Grant on Phone**.
5. Enable the toggle for **NOVA JARVIS** in the Android system settings.
6. Return to NOVA; your notification feed and phone intelligence are now fully active.
