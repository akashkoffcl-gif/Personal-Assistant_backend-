# Phase 51.1 — Tool Capability Implementation Matrix

| Domain Category | Tool ID | Tool Name | Risk Level | Confirmation Required | Target Domain Service |
|---|---|---|---|---|---|
| **PERSONAL_MANAGEMENT** | `get_personal_profile` | Get Personal Profile | LOW | No | `AIToolsService.getProfileSummary` |
| | `get_personal_memories` | Get Personal Memories | LOW | No | `AIMemoryService.getMemories` |
| | `remember_preference` | Remember Preference | MEDIUM | No | `AIMemoryService.remember` |
| | `forget_memory` | Forget Memory | MEDIUM | No | `AIMemoryService.forget` |
| | `clear_all_memories` | Clear All Memories | HIGH | Yes | `PrismaService.knowledgeNote` |
| **TASK_MANAGEMENT** | `create_task` | Create Task | MEDIUM | No | `TasksService.create` |
| | `create_subtask` | Create Subtask | MEDIUM | No | `TasksService.createSubtask` |
| | `complete_task` | Complete Task | MEDIUM | No | `TasksService.complete` |
| | `update_task` | Update Task | MEDIUM | No | `TasksService.update` |
| | `reschedule_task` | Reschedule Task | MEDIUM | No | `TasksService.reschedule` |
| | `delete_task` | Delete Task | HIGH | Yes | `TasksService.remove` |
| | `get_overdue_tasks` | Get Overdue Tasks | LOW | No | `TasksService.findOverdue` |
| **PROJECT_MANAGEMENT** | `get_projects_status` | Get Projects Status | LOW | No | `ProjectsService.findAll` |
| | `create_project` | Create Project | MEDIUM | No | `ProjectsService.create` |
| | `update_project_status` | Update Project Status | MEDIUM | No | `ProjectsService.update` |
| | `delete_project` | Delete Project | HIGH | Yes | `ProjectsService.remove` |
| **CALENDAR_ROUTINES** | `get_daily_schedule` | Get Daily Schedule | LOW | No | `TasksService.findAll` |
| | `generate_smart_day_plan` | Generate Smart Day Plan | MEDIUM | No | `SmartPlannerService.generatePlan` |
| | `apply_day_plan` | Apply Day Plan | HIGH | Yes | `SmartPlannerService.commitPlan` |
| | `get_routine_streaks` | Get Routine Streaks | LOW | No | `RoutinesService.findAll` |
| | `complete_routine` | Complete Routine | LOW | No | `RoutinesService.recordOccurrence` |
| | `create_routine` | Create Routine | MEDIUM | No | `RoutinesService.create` |
| **FINANCIAL_INTELLIGENCE**| `get_finance_summary` | Get Finance Summary | LOW | No | `FinanceService.getSummary` |
| | `get_finance_accounts` | Get Finance Accounts | LOW | No | `FinanceService.getAccounts` |
| | `create_transaction_entry` | Create Transaction Entry | HIGH | Yes | `FinanceService.createTransaction` |
| **KNOWLEDGE_MANAGEMENT** | `search_knowledge_hub` | Search Knowledge Hub | LOW | No | `KnowledgeService.searchNotes` |
| | `create_knowledge_note` | Create Knowledge Note | MEDIUM | No | `KnowledgeService.createNote` |
| | `delete_knowledge_note` | Delete Knowledge Note | HIGH | Yes | `KnowledgeService.deleteNote` |
| **ANALYTICS** | `get_productivity_analytics`| Get Productivity Analytics | LOW | No | `AIToolsService.getProductivityAnalytics` |
| **WELLNESS** | `log_water_intake` | Log Water Intake | LOW | No | `WellnessService.createRecord` |
| | `log_exercise` | Log Exercise | LOW | No | `WellnessService.createRecord` |
| | `log_sleep` | Log Sleep | LOW | No | `WellnessService.createRecord` |
| | `get_wellness_summary` | Get Wellness Summary | LOW | No | `WellnessService.getSummary` |
| **FOCUS** | `start_focus_session` | Start Focus Session | LOW | No | `FocusService.startSession` |
| | `pause_focus_session` | Pause Focus Session | LOW | No | `FocusService.pauseSession` |
| | `finish_focus_session` | Finish Focus Session | LOW | No | `FocusService.completeSession` |
| | `get_focus_analytics` | Get Focus Analytics | LOW | No | `FocusService.getDailySummary` |
| **GOALS** | `create_goal` | Create Goal | MEDIUM | No | `GoalsService.create` |
| | `update_goal_progress` | Update Goal Progress | MEDIUM | No | `GoalsService.logProgress` |
| **EMERGENCIES** | `report_emergency` | Report Emergency | HIGH | Yes | `EmergenciesService.create` |
| | `get_emergency_status` | Get Emergency Status | LOW | No | `EmergenciesService.getActive` |
| **NOTIFICATIONS** | `create_reminder` | Create Reminder | MEDIUM | No | `AIToolsService.createReminder` |
| | `get_in_app_notifications`| Get In-App Notifications | LOW | No | `NotificationsService.findAll` |
| | `get_pending_followups` | Get Pending Follow-ups | LOW | No | `FollowUpsService.getPending` |
| **SETTINGS** | `get_current_settings` | Get Current Settings | LOW | No | `SettingsService.getSettings` |
| | `update_user_settings` | Update User Settings | MEDIUM | No | `SettingsService.updateSettings` |
| **APPLICATION_CUSTOMIZATION** | `get_dashboard_layout` | Get Dashboard Layout | LOW | No | `AIDashboardCustomizationService.getLayout` |
| | `customize_dashboard_layout`| Customize Dashboard Layout | MEDIUM | No | `AIDashboardCustomizationService.updateLayout` |
| **AUTOMATION** | `get_automation_rules` | Get Automation Rules | LOW | No | `AutomationService.findAll` |
| | `toggle_automation_rule` | Toggle Automation Rule | MEDIUM | No | `AutomationService.toggleRule` |
| **CLIENT_NAVIGATION** | `navigate_to_tab` | Navigate to Workspace Tab | LOW | No | Client Bridge (`NAVIGATE_TAB`) |

