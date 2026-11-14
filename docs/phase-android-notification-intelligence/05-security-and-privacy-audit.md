# 05 — SECURITY & PRIVACY AUDIT
## Android Notification Ingestion & User Privacy Protections

**Author:** Cybersecurity & DevSecOps Lead  
**Date:** November 2026  

---

## 1. Privacy Guarantees

1. **Explicit Device Authorization**:
   - Only devices with verified public keys, active ECDSA pairing challenges, and valid bearer tokens can post events to `/api/v1/mobile/events`.
2. **Deterministic Data Scrubbing**:
   - 2-factor authentication codes (OTPs), bank account numbers, credit card CVVs, and password reset codes are masked at the listener boundary prior to network egress.
3. **Tenant Isolation**:
   - All Prisma queries enforce strict `where: { userId }` clauses. No cross-tenant notification leakage is possible.
4. **Local Spoken Audio Suppression**:
   - Spoken announcements respect Quiet Hours (`22:00` - `08:00`) and sensitive category flags (financial and health notifications are never vocalized without explicit toggle).
