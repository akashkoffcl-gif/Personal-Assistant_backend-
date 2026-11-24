package com.nova.companion.workflow.template

import com.nova.companion.workflow.model.WorkflowStepType

/**
 * WorkflowTemplateRegistry
 *
 * In-memory registry that maintains standard and custom scenario workflow templates.
 */
object WorkflowTemplateRegistry {

    private val templates = mutableMapOf<String, WorkflowTemplate>()

    init {
        registerStandardTemplates()
    }

    private fun registerStandardTemplates() {
        // 1. MEETING_PREPARATION
        register(
            WorkflowTemplate(
                templateId = "template_meeting_prep",
                type = WorkflowTemplateType.MEETING_PREPARATION,
                name = "Meeting Preparation",
                description = "Gathers meeting details, relevant contact context, open tasks, and active commitments to generate a meeting prep briefing.",
                requiredParameters = listOf("contact"),
                optionalParameters = listOf("meetingTitle", "timeWindowHours"),
                defaultPriority = 1,
                stepTemplates = listOf(
                    WorkflowStepTemplate(
                        templateStepId = "step_query_cal",
                        sequence = 1,
                        title = "Query Calendar Events",
                        description = "Check calendar for scheduled meeting with contact",
                        stepType = WorkflowStepType.QUERY_CALENDAR
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_read_context",
                        sequence = 2,
                        title = "Read Contact Context",
                        description = "Analyze conversation history and relationship with contact",
                        stepType = WorkflowStepType.READ_CONTEXT,
                        dependsOnTemplateStepIds = listOf("step_query_cal")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_tasks",
                        sequence = 3,
                        title = "Query Related Tasks",
                        description = "Find pending tasks associated with the contact",
                        stepType = WorkflowStepType.QUERY_TASKS,
                        dependsOnTemplateStepIds = listOf("step_read_context")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_commitments",
                        sequence = 4,
                        title = "Query Active Commitments",
                        description = "Find pending promises or deliverables involving contact",
                        stepType = WorkflowStepType.QUERY_COMMITMENTS,
                        dependsOnTemplateStepIds = listOf("step_read_context")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_gen_summary",
                        sequence = 5,
                        title = "Generate Meeting Briefing",
                        description = "Synthesize meeting briefing with agenda, tasks, and commitments",
                        stepType = WorkflowStepType.GENERATE_SUMMARY,
                        dependsOnTemplateStepIds = listOf("step_query_tasks", "step_query_commitments")
                    )
                )
            )
        )

        // 2. COMMITMENT_TRACKING
        register(
            WorkflowTemplate(
                templateId = "template_commitment_tracking",
                type = WorkflowTemplateType.COMMITMENT_TRACKING,
                name = "Commitment Tracking",
                description = "Audits active commitments and obligations, associates related tasks, and builds an actionable commitment digest.",
                requiredParameters = emptyList(),
                optionalParameters = listOf("contact", "urgency"),
                defaultPriority = 0,
                stepTemplates = listOf(
                    WorkflowStepTemplate(
                        templateStepId = "step_query_commitments",
                        sequence = 1,
                        title = "Audit Commitments",
                        description = "Retrieve all active, pending, and overdue commitments",
                        stepType = WorkflowStepType.QUERY_COMMITMENTS
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_tasks",
                        sequence = 2,
                        title = "Query Linked Tasks",
                        description = "Retrieve associated personal tasks for outstanding commitments",
                        stepType = WorkflowStepType.QUERY_TASKS,
                        dependsOnTemplateStepIds = listOf("step_query_commitments")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_read_context",
                        sequence = 3,
                        title = "Correlate Context",
                        description = "Cross-reference context for commitment participants",
                        stepType = WorkflowStepType.READ_CONTEXT,
                        dependsOnTemplateStepIds = listOf("step_query_commitments")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_gen_summary",
                        sequence = 4,
                        title = "Generate Commitment Digest",
                        description = "Compile prioritized status of all open obligations",
                        stepType = WorkflowStepType.GENERATE_SUMMARY,
                        dependsOnTemplateStepIds = listOf("step_query_tasks", "step_read_context")
                    )
                )
            )
        )

        // 3. FOLLOW_UP_MANAGEMENT
        register(
            WorkflowTemplate(
                templateId = "template_follow_up_mgmt",
                type = WorkflowTemplateType.FOLLOW_UP_MANAGEMENT,
                name = "Follow-Up Management",
                description = "Identifies contacts waiting on replies or deliverables and drafts appropriate follow-up action items.",
                requiredParameters = listOf("contact"),
                optionalParameters = listOf("topic", "urgency"),
                defaultPriority = 1,
                stepTemplates = listOf(
                    WorkflowStepTemplate(
                        templateStepId = "step_read_context",
                        sequence = 1,
                        title = "Inspect Contact State",
                        description = "Examine conversation state and waiting-for-response flag",
                        stepType = WorkflowStepType.READ_CONTEXT
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_commitments",
                        sequence = 2,
                        title = "Check Pending Commitments",
                        description = "Inspect what promises were made to/by this contact",
                        stepType = WorkflowStepType.QUERY_COMMITMENTS,
                        dependsOnTemplateStepIds = listOf("step_read_context")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_tasks",
                        sequence = 3,
                        title = "Check Linked Action Items",
                        description = "Inspect open tasks linked to following up with contact",
                        stepType = WorkflowStepType.QUERY_TASKS,
                        dependsOnTemplateStepIds = listOf("step_read_context")
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_gen_summary",
                        sequence = 4,
                        title = "Generate Follow-Up Recommendation",
                        description = "Synthesize next best response or action needed",
                        stepType = WorkflowStepType.GENERATE_SUMMARY,
                        dependsOnTemplateStepIds = listOf("step_query_commitments", "step_query_tasks")
                    )
                )
            )
        )

        // 4. DAILY_PLANNING
        register(
            WorkflowTemplate(
                templateId = "template_daily_planning",
                type = WorkflowTemplateType.DAILY_PLANNING,
                name = "Daily Planning",
                description = "Aggregates today's calendar schedule, open tasks, outstanding commitments, and context to produce an organized daily plan.",
                requiredParameters = emptyList(),
                optionalParameters = listOf("dayOffset"),
                defaultPriority = 0,
                stepTemplates = listOf(
                    WorkflowStepTemplate(
                        templateStepId = "step_query_cal",
                        sequence = 1,
                        title = "Retrieve Day Calendar",
                        description = "Load today's calendar events and schedule",
                        stepType = WorkflowStepType.QUERY_CALENDAR
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_tasks",
                        sequence = 2,
                        title = "Retrieve Priority Tasks",
                        description = "Load open and overdue tasks for today",
                        stepType = WorkflowStepType.QUERY_TASKS
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_query_commitments",
                        sequence = 3,
                        title = "Retrieve Due Commitments",
                        description = "Load commitments with upcoming deadlines",
                        stepType = WorkflowStepType.QUERY_COMMITMENTS
                    ),
                    WorkflowStepTemplate(
                        templateStepId = "step_gen_summary",
                        sequence = 4,
                        title = "Synthesize Daily Plan",
                        description = "Construct comprehensive daily briefing with timeline and priorities",
                        stepType = WorkflowStepType.GENERATE_SUMMARY,
                        dependsOnTemplateStepIds = listOf("step_query_cal", "step_query_tasks", "step_query_commitments")
                    )
                )
            )
        )
    }

    fun register(template: WorkflowTemplate) {
        templates[template.templateId] = template
    }

    fun getTemplate(templateId: String): WorkflowTemplate? = templates[templateId]

    fun getTemplateByType(type: WorkflowTemplateType): WorkflowTemplate? {
        return templates.values.find { it.type == type }
    }

    fun getAllTemplates(): List<WorkflowTemplate> = templates.values.toList()
}
