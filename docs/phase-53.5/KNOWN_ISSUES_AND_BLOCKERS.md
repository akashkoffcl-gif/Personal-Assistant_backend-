# Known Issues and Blockers

**Phase:** 53.5  
**Target:** Catalog remaining environmental boundaries and external dependencies.

---

1. **Physical iOS Safari Background Push Restrictions:**
   - On iOS 16.4+, Web Push is only supported if the user has explicitly added the PWA to their Home Screen ("Add to Home Screen"). In standard browser tabs, push subscription prompts are blocked by the OS.
2. **Third-Party Push Service Connectivity:**
   - Web Push delivery relies on external push services (`fcm.googleapis.com`, `push.services.mozilla.com`). Outbound internet access and valid TLS handshake are required.
3. **Dedicated Cloud Production Infrastructure:**
   - Current multi-node validation was executed in local staging across ports 3001 and 3002. Production cloud container deployment remains subject to hosting authorization.

