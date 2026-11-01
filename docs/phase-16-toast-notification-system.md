# Phase 16 — Global Toastify System & Centralized Application Notifications

**Repository:** `D:\PT`  
**Product:** Personal Task, Routine, Smart Reminder & Wellness Assistant PWA  
**Architecture:** Next.js 14 App Router, NestJS 10 API, Supabase PostgreSQL, Redis BullMQ  
**Design System:** Lavender Enterprise UI  
**Status:** Complete & Production Verified  

---

## 1. Executive Summary

Phase 16 implements an enterprise-grade, centralized toast notification and persistent in-app notification infrastructure across the entire Personal Assistant PWA.

Every meaningful user action now produces accessible, semantic visual feedback while eliminating all browser-native dialogs (`window.alert()`, `window.confirm()`, and `window.prompt()`).

---

## 2. Global Toast Provider Architecture

### A. Library Selection & Compatibility

After inspecting `apps/web/package.json` (React 18.3.1, Next.js 14.2.15 App Router), **Sonner** was selected and installed as the authoritative toast engine.

Sonner provides:
- Zero-dependency runtime overhead.
- Native React 18 concurrent mode & Next.js App Router streaming compatibility.
- Seamless headless styling through custom Tailwind CSS classes.
- Full support for `toast.promise()`, action buttons, cancel callbacks, and multi-toast stacking.

### B. Global Mount Point

Mounted once in [`apps/web/src/app/providers.tsx`](file:///D:/PT/apps/web/src/app/providers.tsx), wrapping the application root layout:

```tsx
<QueryClientProvider client={queryClient}>
  <ToastProvider>{children}</ToastProvider>
</QueryClientProvider>
```

### C. Visual Design & Positioning

- **Positioning:**
  - **Desktop (`>= 640px`):** `top-right` (ensures hero charts and horizontal navigation remain unobstructed).
  - **Mobile (`< 640px`):** `top-center` (avoids bottom PWA navigation).
- **Lavender Enterprise Tokens:**
  - **Surface:** Pure White `#FFFFFF`.
  - **Border:** Subtle Lavender Border (`border border-[#E5E2F5]`).
  - **Drop Shadow:** Soft Ambient Elevation (`shadow-[0_12px_35px_rgba(24,27,46,0.08)]`).
  - **Corners:** High-radius pill card (`rounded-[18px]`).
  - **Close Control:** Circular pill close button (`rounded-full border border-[#E5E2F5]`).
  - **Action Buttons:** Dark Charcoal Pill (`bg-[#18181B] text-white hover:bg-black`).

---

## 3. Unified Notification API

Exposed through [`apps/web/src/components/Toast.tsx`](file:///D:/PT/apps/web/src/components/Toast.tsx):

```typescript
// 1. Success Feedback (Emerald #16A36A)
toast.success('Task Completed', 'Good progress! Schedule updated.');

// 2. Error Feedback (Rose #E05268)
toast.error('Update Failed', 'Network connection interrupted. Retrying...');

// 3. Warning Feedback (Amber #F59E0B)
toast.warning('Emergency Replan Applied', 'Plan v2 active with 1 shifted slot.');

// 4. Information Feedback (Purple #8B45F5)
toast.info('Data Refreshed', 'All workspaces synchronized with Supabase & Redis.');

// 5. Loading Indicator (Animated Violet Spinner)
const toastId = toast.loading('Synchronizing calendar blocks...');

// 6. Promise Tracking with Lifecycle Transitions
toast.promise(exportJob, {
  loading: 'Preparing comprehensive user archive...',
  success: 'Export package downloaded successfully!',
  error: (err) => `Export failed: ${err.message}`,
});

// 7. Manual Dismissal
toast.dismiss(toastId);
```

### Automatic Deduplication Engine
Prevents duplicate notifications caused by React 18 strict mode double-invocations or rapid double-clicks using an in-memory 1,200ms deduplication window.

---

## 4. Elimination of Native Dialogs

All remaining browser-native modal calls have been eliminated:
- `window.alert()` ➔ Replaced with `toast.error()` / `toast.warning()`.
- `window.prompt()` ➔ Replaced with accessible inline modals ([`SmartCheckInModal.tsx`](file:///D:/PT/apps/web/src/components/SmartCheckInModal.tsx)).
- `window.confirm()` ➔ Replaced with accessible [`ConfirmDialog.tsx`](file:///D:/PT/apps/web/src/components/ConfirmDialog.tsx) featuring keyboard focus traps, Esc key dismiss, and explicit destructive action styling.

