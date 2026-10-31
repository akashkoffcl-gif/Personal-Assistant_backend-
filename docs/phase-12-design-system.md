# Phase 12 — Lavender Enterprise Design System Specification

## 1. Overview & Visual Direction
Phase 12 transitions the Personal Task, Routine, Smart Reminder & Wellness Assistant PWA into a cohesive, high-density **Lavender Enterprise Design System**, directly modeled after the user-supplied reference dashboard screenshot.

The design replaces flat utility grey themes and excessive prototype glassmorphism with an intentional, calm, and balanced aesthetic characterized by:
- Soft lavender canvases (`#EAE9FF`)
- Secondary navigation surfaces (`#F4F3FF`)
- Clean white card surfaces (`#FFFFFF`)
- Primary and deep purple operational accents (`#8B45F5`, `#6935C8`)
- High-contrast dark typography (`#202033`)
- Muted secondary typography (`#74738A`)
- Harmonious border definitions (`#E5E2F5`)
- Clear semantic status indicators (Success `#16A36A`, Warning `#E5A12A`, Critical `#E05268`)
- Consistent 12–16px border radiuses (`rounded-xl` / `rounded-2xl`) and gentle shadows (`shadow-[0_4px_20px_rgba(139,69,245,0.05)]`)

---

## 2. Color Token Architecture

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| **Canvas Background** | `#EAE9FF` | Primary application-wide viewport canvas |
| **Secondary Surface** | `#F4F3FF` | Sidebar background, subtle metric cards, search inputs, active table headers |
| **Card Surface** | `#FFFFFF` | Core content containers, modal surfaces, floating panels |
| **Primary Purple** | `#8B45F5` | Main CTAs, active tab selections, primary chart focus highlights |
| **Deep Purple** | `#6935C8` | Brand marks, gradients, high-emphasis text, secondary badge text |
| **Primary Text** | `#202033` | Headings, KPI values, high-contrast readable content |
| **Secondary Text** | `#74738A` | Captions, timestamps, subtags, table headers, breadcrumbs |
| **Border / Divider** | `#E5E2F5` | Subtle separation lines, card strokes, input outlines |
| **Semantic Success** | `#16A36A` | Completed tasks, high adherence percentages, healthy sync status |
| **Semantic Warning** | `#E5A12A` | Cooldown notifications, routine delays, warning indicators |
| **Semantic Critical** | `#E05268` | Emergency replanning, overdue deadlines, operational exceptions |

---

## 3. Typography & Sizing Standards

- **Font Family:** Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
- **Hierarchy:**
  - Page Title: `text-xl font-black tracking-tight text-[#202033]`
  - Workspace Header: `text-base sm:text-lg font-extrabold tracking-tight text-[#202033]`
  - Metric Values: `text-xl sm:text-2xl font-black text-[#202033]`
  - Body Text: `text-xs font-medium text-[#202033]`
  - Captions & Metas: `text-[11px] font-medium text-[#74738A]`
  - Overlines & Subtitles: `text-[10px] font-bold uppercase tracking-wider text-[#74738A]`
- **Interactive Badges:**
  - Active Pills: `bg-[#8B45F5] text-white px-3 py-1 rounded-xl text-xs font-bold`
  - Subtle Badges: `bg-[#F4F3FF] text-[#8B45F5] px-2.5 py-0.5 rounded-full border border-[#E5E2F5] text-[10px] font-bold`
  - Success Badges: `bg-[#DCFCE7] text-[#16A36A] px-2 py-0.5 rounded-full text-[10px] font-bold`
  - Critical Badges: `bg-[#FFEAEF] text-[#E05268] px-2 py-0.5 rounded-full text-[10px] font-bold`

---

## 4. Layout Architecture

### A. Grouped Responsive Sidebar (`apps/web/src/components/Sidebar.tsx`)
The desktop navigation is structured into five distinct operational groups:
1. **OVERVIEW**: Command Center (`dashboard`), My Day (`my-day`)
2. **PRODUCTIVITY**: Work & Tasks (`work`), Projects (`projects`), Habits & Routines (`routines`), Day Planning (`planning`), Calendar Views (`calendar`)
3. **INTELLIGENCE**: Personal Productivity Analytics (`analytics`), Application Usage Analytics (`usage-analytics` with `New` badge), Automation Rules (`automation`)
4. **WELLNESS**: Health & Wellness (`wellness`)
5. **SYSTEM**: Emergency Replan (`emergency` with `Urgent` badge), Settings (`settings`)
- Live sync footer displaying authoritative connection status with Supabase PostgreSQL and BullMQ Redis outbox.

### B. Compact Top Header (`apps/web/src/components/Header.tsx`)
- Breadcrumb with workspace category, live date context pill (`2026-10-31`)
- Universal Search Bar with `⌘K` keyboard shortcut trigger
- Quick Add button (`+`) with context dropdown for Tasks, Routines, and Emergency Replanning
- Emergency Replan pill button (`#FFEAEF` background, `#E05268` text)
- Background Sync button (`RefreshCw`) with spinning status state
- Web Push Notification toggle (`BellRing` / `Bell`)
- User Profile Pill with initials avatar, name (`Selma Knight`), email, and chevron

### C. Command Center Dashboard (`apps/web/src/components/ModernDribbbleDashboard.tsx`)
Directly reflects the layout composition of the reference screenshot:
- **Card 1 (Left 7 cols):** Productivity Velocity ("Engagement Click" layout with weekly bars, Saturday purple highlight, total click metric, and View All link)
- **Card 2 (Right 5 cols):** Schedule & Routines ("Schedule Campaign" layout with 9-day horizontal date strip, active current date indicator, and status-badged cards)
- **Card 3 (Bottom Left):** Habit Adherence ("Visit for Today" layout with 847 metric, coral progress ring, and AI Transform feature card)
- **Card 4 (Bottom Center):** Top Focus Categories ("Top Campaign" layout with ranked items, clicks, and user tags)
- **Card 5 (Bottom Right):** Geographic / Device Footprint ("User Location" layout with world map dot matrix and 200+ total location indicator)

---

## 5. Visual Artifacts
- **Desktop Command Center:** `docs/screenshots/phase12_lavender_desktop.png`
- **Application Usage Analytics:** `docs/screenshots/phase12_usage_analytics.png`
- **Mobile Viewport:** `docs/screenshots/phase12_lavender_mobile.png`
