# Phase 24: Application Usage Analytics — Single-Screen Design Specification

## 1. Overview & Objective
Phase 24 Part G compressed the Application Usage Analytics page (`ApplicationUsageAnalytics.tsx`) into a strict single-screen desktop application viewport across all supported enterprise desktop resolutions:
- **1920 × 1080** (Full HD)
- **1600 × 900** (Standard Desktop)
- **1440 × 900** (MacBook Pro)
- **1366 × 768** (Laptop HD)

---

## 2. Layout Structure & Grid Budget

```
+------------------------------------------------------------------------------------------------+
| ROW 1: HEADER & CONTROLS (h-[44px])                                                            |
| Domain B Telemetry Pill | Live Logging Pulse | Title | 7D/14D/30D Pills | Refresh | Export JSON|
+------------------------------------------------------------------------------------------------+
| ROW 2: EIGHT COMPACT KPI CARDS (h-[60px], 8 cols)                                              |
| Interactions | Active Days | Top Module | Top Feature | Adoption | Automation | Reminders | Err|
+------------------------------------------------------------------------------------------------+
| ROW 3: MAIN ANALYTICS GRID (flex-1 min-h-[210px] max-h-[290px], 12 cols)                       |
|   LEFT (7 COLS): Interaction Volume (Bars + Tooltips)  |  RIGHT (5 COLS): Module Distribution  |
+------------------------------------------------------------------------------------------------+
| ROW 4: SECONDARY ANALYTICS (h-[145px], 5 cols)                                                 |
| Feature Adoption | Automation Engine | Reminder Outcomes | Failed Actions | Recent Events Audit|
+------------------------------------------------------------------------------------------------+
```

---

## 3. Verified Viewport Measurements (Chrome DevTools Protocol)

| Viewport | Resolution | clientHeight | scrollHeight | Scroll Delta | Result |
|---|---|---|---|---|---|
| Desktop Full HD | 1920 × 1080 | 1080px | 1080px | **0px** | **PASS (0px scroll)** |
| Desktop Standard | 1600 × 900 | 900px | 900px | **0px** | **PASS (0px scroll)** |
| MacBook Pro | 1440 × 900 | 900px | 900px | **0px** | **PASS (0px scroll)** |
| Laptop HD | 1366 × 768 | 768px | 768px | **0px** | **PASS (0px scroll)** |
| Tablet Fallback | 768 × 1024 | 1024px | 1742px | 718px | **PASS (Responsive scroll)** |
| Mobile Fallback | 390 × 844 | 844px | 2504px | 1660px | **PASS (Responsive scroll)** |

---

## 4. Telemetry Integrity & Privacy Separation
- **Domain B Separation:** Application telemetry logs only high-level operational events (`task_created`, `routine_completed`, `rule_executed`, `notification_clicked`).
- **Zero Sensitive Data:** Never logs keystrokes, passwords, private task titles, or wellness details.
- **Server Scoping:** Enforces user-scoped isolation in `UsageService` using the authenticated JWT user ID.

---

## 5. Artifact Reference
- Screenshot: `phase24_usage_analytics_1920x1080.png`
- **Status:** **VERIFIED & READY**.
