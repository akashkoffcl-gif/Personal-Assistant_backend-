# Phase 21 — Single-Viewport Command Center Layout Specification

**Project:** Personal Assistant PWA  
**Target:** Command Center Dashboard (`/`)  
**Design System:** Lavender Enterprise Productivity SaaS  
**Standard Viewport Budget:** Single Desktop Viewport without Vertical Scrolling (`scrollHeight <= clientHeight`)  
**Status:** Implemented & Verified

---

## 1. Executive Summary & Architectural Rule

Phase 21 achieves single-viewport desktop visibility for the Personal Assistant Command Center. Every primary and secondary widget—Navbar, Welcome Header with Quick Create actions, 6 KPI cards, Productivity Overview & Task Distribution charts, Today's Schedule timeline, Quick Actions & Replan, Routine Tracker, Projects & Tasks, Wellness & Habit Insights, Recent Activity, and the Productivity Analytics footer bar—renders simultaneously without vertical scrolling across all supported desktop resolutions (1920×1080, 1600×900, 1440×900, 1366×768, and 1280×720).

Natural vertical scrolling is strictly preserved on tablet (`< 1024px`) and mobile viewports (`< 768px`).

---

## 2. Desktop Viewport Height Budget Breakdown

The layout is engineered using a deterministic 5-row CSS Grid structure on `ModernDribbbleDashboard.tsx` nested within an exact-height application container on `page.tsx`:

```css
/* Container constraint */
lg:h-screen lg:max-h-screen lg:overflow-hidden p-2 sm:p-2.5 lg:px-3.5 lg:py-2 max-w-[1760px] w-full mx-auto
```

### Component Height Allocation

| Row | Component | Target Height (1366×768 / 1440×900) | Target Height (1920×1080) | Content & Elements |
|:---:|:---|:---:|:---:|:---|
| **0** | **Horizontal Navbar** | `52px` | `56px` | Brand mark, priority nav tabs, search, quick action, sync badge, user profile |
| **G0** | **Navbar-to-Dashboard Margin** | `6px` | `8px` | `mb-1.5 sm:mb-2` |
| **1** | **Compact Welcome Header** | `66px` | `70px` | Greeting, date, 75% progress ring, "On Track" pill, 5 action buttons (+New Task, +Reminder, +Routine, +Project, ⚠ Emergency Replan) |
| **G1** | **Grid Row Gap** | `6px` | `8px` | `lg:gap-1.5 2xl:lg:gap-2` |
| **2** | **6 KPI Metric Cards** | `84px` | `88px` | Task Completion, Routine Adherence, Upcoming Activities, Overdue Items, Active Projects, Focus Time with trend arrows |
| **G2** | **Grid Row Gap** | `6px` | `8px` | `lg:gap-1.5 2xl:lg:gap-2` |
| **3** | **Primary 3-Column SaaS Grid** | `minmax(210px, 1fr)` (~250-380px) | `minmax(240px, 1fr)` (~440px) | Left (42%): Dual-bar chart + SVG curve + Donut chart; Center (32%): Today's Schedule timeline; Right (26%): Quick actions 2x3 grid + replan banner |
| **G3** | **Grid Row Gap** | `6px` | `8px` | `lg:gap-1.5 2xl:lg:gap-2` |
| **4** | **Supporting 4-Column Balanced Grid** | `140px` | `146px` | Routine Tracker (25%), Projects & Tasks (25%), Wellness & Habits (25%), Recent Activity (25%) |
| **G4** | **Grid Row Gap** | `6px` | `8px` | `lg:gap-1.5 2xl:lg:gap-2` |
| **5** | **Productivity Analytics Footer Bar** | `38px` | `42px` | Weekly/Monthly/Custom tabs, Focus stats (32h 45m), Avg Completion (78%), Most Productive (Tuesday), Active Days (6/7), Quick Add (+) button |
| **Pad** | **Outer Layout Vertical Padding** | `16px` | `16px` | `lg:py-2` (8px top + 8px bottom) |
| **Total**| **Minimum Required Height** | **630px** | **686px** | Fits within 720px, 768px, 900px, and 1080px viewports with zero overflow |

---

## 3. Horizontal Grid Column Proportions

### Primary Grid (Row 3): 42% / 32% / 26%
- **Left Column (42%):** `lg:grid-cols-[42fr_32fr_26fr]`
  - Productivity Overview (7-day dual-bar chart for completed vs scheduled tasks + SVG polynomial completion rate curve).
  - Task Distribution Donut Chart (Total 39 tasks with Work 42%, Personal 28%, Projects 18%, Other 12% color-coded legend).
- **Center Column (32%):**
  - Today's Schedule timeline (6 chronological items: Morning Routine 08:00, Team Meeting 10:00, Lunch Break 12:30, Project Review 14:00, Gym Session 16:00, Dinner 19:00 with priority pills and status badges).
- **Right Column (26%):**
  - Quick Actions 2×3 button grid (Add Task, Add Reminder, Add Routine, Add Project, Add Event, Emergency Replan).
  - Emergency Replan callout shortcut banner.

### Supporting Grid (Row 4): 25% Equal Quadrants
- **Column 1 (25%): Routine Tracker:** 5 daily routines with individual percentage completion bars and status chips.
- **Column 2 (25%): Projects & Tasks:** Tabbed sub-view showing 3 active projects (Website Redesign, Mobile App, Personal Growth) with progress meters and task counts.
- **Column 3 (25%): Wellness & Habit Insights:** 4 wellness metric tiles (Exercise, Water Intake, Sleep, Mood) plus real-time wellness trend SVG spline.
- **Column 4 (25%): Recent Activity Feed:** 4 latest activity events with categorized iconography and relative timestamps.

---

## 4. Responsive Fallbacks & Viewport Rules

- **Desktop (`>= 1024px`):**
  - Single-viewport locked (`lg:h-screen lg:max-h-screen lg:overflow-hidden`).
  - Grid rows automatically adjust via CSS grid `minmax(210px, 1fr)` to consume available height cleanly.
  - Zero document scrolling: `document.documentElement.scrollHeight === document.documentElement.clientHeight`.
- **Tablet (`768px - 1023px`):**
  - Natural vertical scrolling (`max-lg:space-y-3 max-lg:pb-16 max-lg:overflow-y-auto`).
  - 2-column stacked grid cards with touch-friendly button targets (min 44px).
  - Fixed bottom navigation bar with active state indicators.
- **Mobile (`< 768px`):**
  - Single-column flow with smooth scrolling.
  - Horizontally swipeable KPI cards or compact 2-column metric grid.
