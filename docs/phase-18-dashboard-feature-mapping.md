# Phase 18 — Personal Assistant Dashboard Feature Mapping & Domain Correction

## Executive Summary

Phase 18 systematically corrects the domain drift in the Personal Assistant Command Center dashboard. While Phase 12-14 successfully adopted the clean Lavender Enterprise design system (`#EAE9FF` canvas, rounded `26px` cards, `#8B45F5` accents, `#18181B` active states), the visual mock originally retained marketing dashboard terminology ("Engagement Click", "Schedule Campaign", "Total Click", "Visit for Today", "Top Campaign", "User Location").

This document specifies the exact 1-to-1 mapping from marketing mock components to genuine, production-grade Personal Assistant capabilities backed by real Supabase PostgreSQL data, NestJS APIs, and Next.js state.

---

## 1-to-1 Component Mapping Matrix

| Reference Card | Legacy Domain Terminology | New Personal Assistant Feature | Data Source / API | Interactive Actions |
|---|---|---|---|---|
| **Card 1 (Left 7-col hero)** | `Engagement Click`<br>`+2.7%`<br>`15k+ Y-axis`<br>`Sat - 87 Total Click` | **Productivity Velocity**<br>Weekly task & routine completion pacing | `api.getTrends(7)`<br>`api.getDailyKpi(date)`<br>`tasks` & `occurrences` | • Hover daily bar to view completed count<br>• Click bar to jump to day<br>• "View All" navigates to Analytics tab |
| **Card 2 (Right 5-col hero)** | `Schedule Campaign`<br>Mock items: *"Designed to Drive Your Growth"*, *"Make Every Click Count"*, *"Take Your Brand to the Next Level"* | **Today's Schedule & Routine**<br>Real scheduled tasks, recurring routines, and priority focus blocks | `api.getTasks({ date })`<br>`api.getOccurrences(date)` | • 9-day horizontal strip date switching<br>• Click routine ➔ Smart Check-In Modal<br>• Click task ➔ Task Detail Drawer<br>• Month dropdown ➔ Calendar view |
| **Card 3 (Bottom-left 4-col)** | `Visit for Today`<br>`847`<br>Circular gauge<br>AI promo: *"Discover how AI transforms - Go to AI"* | **Daily Completion & Focus**<br>Real task & habit completion rate with proactive Smart Assistant check-in | `kpi.completionRatePercent`<br>`kpi.completedTasks`<br>`kpi.totalTasks` | • Coral circular gauge shows real %<br>• "Check In ↗" button triggers Emergency Replan / Smart Check-in<br>• "View All" jumps to My Day |
| **Card 4 (Bottom-center 4-col)** | `Top Campaign`<br>Mock list: `#1 Simple Solutions (399 Click @novaquest)`, etc. | **Active Projects & Milestones**<br>Ranked active user projects with milestone progress | `api.getProjects()`<br>`ProjectDto[]` | • Shows real user project titles<br>• Milestone completion counts & %<br>• Category tag (@work, @personal, @fitness)<br>• Click project ➔ Projects Workspace |
| **Card 5 (Bottom-right 4-col)** | `User Location`<br>`200+ Total Location`<br>World dot-matrix map | **Wellness & Habit Consistency**<br>Weekly 4-track multi-metric habit adherence radar/matrix | `api.getWellnessSummary(date)`<br>`api.getOccurrences(date)` | • Dot-matrix adherence across Hydration, Activity, Sleep, and Focus<br>• Active streak counter (e.g. 12+ Days)<br>• "View All" navigates to Wellness tab |

---

## Design System Tokens Retained

The visual presentation adheres strictly to the Lavender Enterprise design tokens:
- **Canvas Background:** `#EAE9FF`
- **Card Containers:** `#FFFFFF` with `rounded-[26px]` and border `#E8EAF5`
- **Primary Brand Purple:** `#8B45F5` / `#7C3AED`
- **Active Navigation / Badges:** `#18181B` (Deep Charcoal Black)
- **Subtle Pastel Badges:**
  - Routine item: `#F0FAF4` background, `#DCFCE7` border, `🌱`
  - Task item: `#F4F4FD` background, `#E0E7FF` border, `🎯` / `✌️`
  - Priority item: `#FFF6ED` background, `#FFEDD5` border, `👑`
- **Circular Progress Gauge:** `#FF647C` (Coral Red) over `#F4F4FD` track
- **Typography:** Inter / system font with high-contrast `#18181B` titles and `#717182` secondary labels.
