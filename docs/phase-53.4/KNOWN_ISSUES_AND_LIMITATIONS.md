# Known Issues and Limitations

**Phase:** 53.4  
**Target:** Document operational boundaries of proactive intelligence.

---

1. **Local Redis Fallback in Single-Node Dev:**
   - In environments where Redis is not running, the system gracefully falls back to an in-memory Map. However, in that fallback mode, server restarts clear cooldowns.
2. **Third-Party Calendar Integration Pending:**
   - Direct OAuth synchronization with Google Calendar and Microsoft Outlook is architected and documented, but awaiting production infrastructure credentials.
3. **Web Push Subscription Revocation Detection:**
   - Deactivated subscriptions are only marked `isActive = false` upon dispatch failure (HTTP 410/404) or explicit client unsubscription.

