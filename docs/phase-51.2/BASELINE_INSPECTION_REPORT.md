# Phase 51.2 — Baseline Inspection & Architecture Report

## 1. System Context & Inventory
- **Repository:** `D:\PT`
- **Application:** Nova Personal Assistant PWA
- **Phase Objective:** Transform single-tool execution into a structured Multi-Step Autonomous Workflow Engine without modifying remote database schemas or creating duplicate tool registries.
- **Pre-requisite Certification:** Phase 51.1 certified with 51 registered domain tools and hardened P0 action authorization.

## 2. Capability Operational Classification
The 51 registered tools in `JarvisToolRegistryService` fall into 6 distinct behavioral categories:

### A. Read Operations (Idempotent, Zero Side-Effects, Autonomous Execution)
- `get_personal_profile`, `get_personal_memories`
- `get_overdue_tasks`, `get_projects_status`
- `get_daily_schedule`, `get_routine_streaks`
- `get_finance_summary`, `get_finance_accounts`
- `search_knowledge_hub`, `get_productivity_analytics`
- `get_wellness_summary`, `get_focus_analytics`
- `get_emergency_status`, `get_in_app_notifications`, `get_pending_followups`
- `get_current_settings`, `get_dashboard_layout`, `get_automation_rules`

### B. Mutations (Reversible or Low-Impact Domain State Changes)
- `create_task`, `create_subtask`, `complete_task`, `update_task`, `reschedule_task`
- `create_project`, `update_project_status`
- `generate_smart_day_plan`, `complete_routine`, `create_routine`
- `create_knowledge_note`, `remember_preference`, `forget_memory`
- `log_water_intake`, `log_exercise`, `log_sleep`
- `start_focus_session`, `pause_focus_session`, `finish_focus_session`
- `create_goal`, `update_goal_progress`
- `create_reminder`, `update_user_settings`, `customize_dashboard_layout`, `toggle_automation_rule`

### C. Reversible Mutations with Direct Domain Compensation
- `create_task` <-> `delete_task`
- `create_project` <-> `delete_project`
- `create_knowledge_note` <-> `delete_knowledge_note`
- `start_focus_session` <-> `finish_focus_session` / cancel

### D. Destructive / High-Risk Operations (Mandatory Explicit Confirmation Required)
- `delete_task`, `delete_project`, `delete_knowledge_note`
- `clear_all_memories`
- `apply_day_plan`
- `create_transaction_entry`
- `report_emergency`

### E. External Side-Effects
- `create_reminder` (Triggers BullMQ push notifications via Web Push VAPID keys)
- `report_emergency` (Triggers mass task reschedule and automated alerts)

### F. Client-Only Navigation Bridge
- `navigate_to_tab` (Emits typed `ai-assistant:navigate` window events)

## 3. Persistence Schema Mapping
To support DAG multi-step workflows without running risky database migrations on remote Supabase PostgreSQL:
- **Parent Workflow Record:** Represented by `AIAction` with `actionType: 'MULTI_STEP_WORKFLOW'` and structured JSON payload:
  - `workflowId`, `title`, `userPrompt`, `dag: { steps, edges }`, `executionGraph`, `approvalSignature`, `compensationLog`.
- **Step Persistence:** Sub-elements inside `payload.steps` indexed by step ID, capturing individual `toolId`, `status`, `input`, `output`, `error`, `idempotencyKey`, and `executedAt`.
- **Approval Signature:** Binds authenticated `userId`, `workflowId`, step hash (`SHA-256` of canonical step inputs), and approval timestamp.
- **Asynchronous Execution Queue:** BullMQ `ai-workflows-queue` already defined in `WorkerService` with single-worker concurrency protection.

