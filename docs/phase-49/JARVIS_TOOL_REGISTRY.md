# Phase 49 — Unified JARVIS Tool Registry & Capability Specification

**Phase:** Phase 49 — Section 4 Complete Application Tool Access  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Component:** `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`

---

## 1. Registry Architecture & Capability Groups

Every tool exposed to the AI assistant implements strict typing, permission scoping, idempotency support, and risk classification across 10 capability groups:

| Group | Identifier | Capability Name | Risk Level | Requires Confirmation | Target Domain Service |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **A. Personal Management** | `get_personal_profile` | Get Personal Profile | LOW | No | `PrismaService.user` |
| | `get_personal_memories` | Get Personal Memories | LOW | No | `AIMemoryService` |
| | `remember_preference` | Remember Preference | MEDIUM | No | `AIMemoryService` |
| | `forget_memory` | Forget Memory | MEDIUM | No | `AIMemoryService` |
| **B. Task Management** | `create_task` | Create Task | MEDIUM | **Yes** | `AIToolsService.createTask` |
| | `complete_task` | Complete Task | MEDIUM | **Yes** | `AIToolsService.completeTask` |
| | `delete_task` | Delete Task | HIGH | **Yes** | `PrismaService.task` |
| | `get_overdue_tasks` | Get Overdue Tasks | LOW | No | `PrismaService.task` |
| **C. Project Management** | `get_projects_status` | Get Projects Status | LOW | No | `PrismaService.project` |
| | `create_project` | Create Strategic Project | MEDIUM | **Yes** | `PrismaService.project` |
| **D. Calendar & Routines**| `get_daily_schedule` | Get Daily Schedule | LOW | No | `AIToolsService.getDaySchedule`|
| | `generate_smart_day_plan`| Generate Smart Day Plan | MEDIUM | **Yes** | `SmartPlannerService` |
| **E. Financial Intelligence**| `get_finance_summary` | Get Finance Summary | LOW | No | `AIToolsService.getFinanceSummary`|
| **F. Knowledge Management**| `search_knowledge_hub` | Search Knowledge Hub | LOW | No | `AIToolsService.searchKnowledge`|
| | `create_knowledge_note` | Create Knowledge Note | MEDIUM | **Yes** | `AIToolsService.createNote` |
| **G. Analytics** | `get_productivity_analytics`| Productivity Analytics | LOW | No | `AIToolsService.getSystemAnalysis`|
| **H. Notifications** | `create_reminder` | Create Alert Reminder | MEDIUM | **Yes** | `AIToolsService.createReminder`|
| **I. App Customization** | `get_dashboard_layout` | Get Dashboard Layout | LOW | No | `AIDashboardCustomizationService`|
| | `customize_dashboard_layout`| Customize Dashboard Layout | MEDIUM | **Yes** | `AIDashboardCustomizationService`|
| **J. Automation** | `get_automation_rules` | Get Automation Rules | LOW | No | `PrismaService.automationRule`|

---

## 2. Safety & Risk Classification
- **LOW**: Read-only queries with zero mutations. Executed immediately with zero user disruption.
- **MEDIUM**: State creations or updates (e.g. creating tasks, setting reminders, customizing dashboard layouts). Require structured proposal and confirmation.
- **HIGH**: Permanent deletions, financial adjustments, or irreversible operations. Require explicit two-step user authorization with confirmation tokens.

