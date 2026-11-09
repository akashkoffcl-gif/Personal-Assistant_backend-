# Phase 51.7 — Tool Capability Certification Matrix

## 1. Authoritative Tool Inventory & Scope

Below is the certified audit of all 52 registered tools in `JarvisToolRegistryService`:

| Tool Identifier | Domain Category | Operation Type | Confirmation Gate | Idempotency Support | Tenant Scoped | Test Coverage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `get_personal_profile` | PERSONAL_MANAGEMENT | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `get_personal_memories` | PERSONAL_MANAGEMENT | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `remember_preference` | PERSONAL_MANAGEMENT | MUTATION | Yes | Logical Key | Yes | Integration | **CERTIFIED** |
| `forget_memory` | PERSONAL_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `clear_all_memories` | PERSONAL_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `create_task` | TASK_MANAGEMENT | MUTATION | Yes | In-Tx Atomic | Yes | Integration/E2E | **CERTIFIED** |
| `create_subtask` | TASK_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `complete_task` | TASK_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `update_task` | TASK_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `reschedule_task` | TASK_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `delete_task` | TASK_MANAGEMENT | MUTATION | Yes (HIGH) | Target ID | Yes | Integration | **CERTIFIED** |
| `get_overdue_tasks` | TASK_MANAGEMENT | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `get_projects_status` | PROJECT_MANAGEMENT | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `create_project` | PROJECT_MANAGEMENT | MUTATION | Yes | In-Tx Atomic | Yes | Integration/E2E | **CERTIFIED** |
| `update_project_status`| PROJECT_MANAGEMENT | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `delete_project` | PROJECT_MANAGEMENT | MUTATION | Yes (HIGH) | Target ID | Yes | Integration | **CERTIFIED** |
| `get_daily_schedule` | CALENDAR_ROUTINES | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `generate_smart_day_plan`| CALENDAR_ROUTINES | READ/COMPUTE | Yes | Logical Key | Yes | Integration | **CERTIFIED** |
| `apply_day_plan` | CALENDAR_ROUTINES | MUTATION | Yes (HIGH) | Proposal ID | Yes | Integration | **CERTIFIED** |
| `get_routine_streaks` | CALENDAR_ROUTINES | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `complete_routine` | CALENDAR_ROUTINES | MUTATION | No | Target ID | Yes | Integration | **CERTIFIED** |
| `create_routine` | CALENDAR_ROUTINES | MUTATION | Yes | In-Tx Atomic | Yes | Integration/E2E | **CERTIFIED** |
| `get_finance_summary` | FINANCIAL_INTELLIGENCE | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `get_finance_accounts` | FINANCIAL_INTELLIGENCE | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `create_transaction_entry`| FINANCIAL_INTELLIGENCE | MUTATION | Yes (HIGH) | In-Tx Atomic | Yes | Integration/E2E | **CERTIFIED** |
| `search_knowledge_hub` | KNOWLEDGE_MANAGEMENT | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `create_knowledge_note`| KNOWLEDGE_MANAGEMENT | MUTATION | Yes | In-Tx Atomic | Yes | Integration/E2E | **CERTIFIED** |
| `delete_knowledge_note`| KNOWLEDGE_MANAGEMENT | MUTATION | Yes (HIGH) | Target ID | Yes | Integration | **CERTIFIED** |
| `get_productivity_analytics`| ANALYTICS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `log_water_intake` | WELLNESS | MUTATION | No | Timestamped | Yes | Integration | **CERTIFIED** |
| `log_exercise` | WELLNESS | MUTATION | No | Timestamped | Yes | Integration | **CERTIFIED** |
| `log_sleep` | WELLNESS | MUTATION | No | Timestamped | Yes | Integration | **CERTIFIED** |
| `get_wellness_summary` | WELLNESS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `start_focus_session` | FOCUS | MUTATION | Yes | Session ID | Yes | Integration | **CERTIFIED** |
| `pause_focus_session` | FOCUS | MUTATION | No | Session ID | Yes | Integration | **CERTIFIED** |
| `finish_focus_session`| FOCUS | MUTATION | No | Session ID | Yes | Integration | **CERTIFIED** |
| `abort_focus_session` | FOCUS | MUTATION | No | Session ID | Yes | Integration | **CERTIFIED** |
| `get_focus_analytics` | FOCUS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `create_goal` | GOALS | MUTATION | Yes | Target ID | Yes | Integration | **CERTIFIED** |
| `update_goal_progress`| GOALS | MUTATION | No | Target ID | Yes | Integration | **CERTIFIED** |
| `report_emergency` | EMERGENCIES | MUTATION | Yes (HIGH) | Incident ID | Yes | Integration | **CERTIFIED** |
| `get_emergency_status`| EMERGENCIES | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `create_reminder` | NOTIFICATIONS | MUTATION | Yes | Outbox Key | Yes | Integration | **CERTIFIED** |
| `get_in_app_notifications`| NOTIFICATIONS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `get_pending_followups`| NOTIFICATIONS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `get_current_settings`| SETTINGS | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `update_user_settings`| SETTINGS | MUTATION | Yes | Settings DTO| Yes | Integration | **CERTIFIED** |
| `get_dashboard_layout`| APPLICATION_CUSTOMIZATION| READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `customize_dashboard_layout`| APPLICATION_CUSTOMIZATION| MUTATION | Yes | Layout DTO | Yes | Integration | **CERTIFIED** |
| `get_automation_rules`| AUTOMATION | READ | No | N/A | Yes | Integration | **CERTIFIED** |
| `toggle_automation_rule`| AUTOMATION | MUTATION | Yes | Rule ID | Yes | Integration | **CERTIFIED** |
| `navigate_to_tab` | CLIENT_NAVIGATION | CLIENT_ACTION | No | Tab Enum | Yes | Integration | **CERTIFIED** |

Total tools tested via authenticated HTTP requests: **52/52 (100% Passing)**.

