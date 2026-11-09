# Authentication Repair & Bearer Lifecycle Verification

## 1. Problem Description
Background worker jobs and sub-agent queries were prone to missing or corrupted Bearer headers when calling internal REST controllers.

## 2. Repairs Executed
- Unified `getAuthHeaders()` in `apps/web/src/lib/api.ts` to ensure cached valid Supabase sessions are attached to all outbound requests.
- Added strict token validation: tokens are verified before injection.
- Sanitized console logs to prevent JWT tokens or Authorization headers from printing to terminal stdout or browser devtools console.
- Ensured 401 unauthenticated responses prompt smooth session refresh rather than infinite redirects.

