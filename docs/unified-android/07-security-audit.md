# 07 — SECURITY & PRIVACY AUDIT
## Unified Android Client Security & Isolation Verification

**Author:** Cybersecurity & DevSecOps Lead  
**Date:** November 2026  

---

## 1. WebView Threat Modeling & Mitigations

| Threat | Attack Vector | Engineered Countermeasure |
| :--- | :--- | :--- |
| **Cross-Site Scripting (XSS) to Native Escalation** | Injected script calls native Android APIs | Native bridge checks origin against whitelist; bridge only exposes whitelisted methods, no raw shell or file I/O. |
| **Arbitrary File Access** | `file://` scheme loading local secrets | `setAllowFileAccess(false)` and `setAllowContentAccess(false)` strictly enforced. |
| **MitM Attack on WebView Assets** | Interception of plain HTTP traffic | `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW`. Enforces strict HTTPS. |
| **Malicious URL Phishing** | Third-party redirection inside WebView | `shouldOverrideUrlLoading` intercepts non-NOVA origins and forces open in the system default browser. |

---

## 2. Cryptographic Integrity & Keystore Protection
- Private keys generated inside the hardware-backed `AndroidKeyStore` (`KeyProperties.PURPOSE_SIGN`).
- E2EE device pairing challenge signatures cannot be spoofed or exported by web scripts.
