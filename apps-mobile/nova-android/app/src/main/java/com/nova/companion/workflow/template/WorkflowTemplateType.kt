package com.nova.companion.workflow.template

/**
 * Standard Workflow Template types supported by Phase 69.6 Scenario Engine.
 */
enum class WorkflowTemplateType {
    MEETING_PREPARATION,
    COMMITMENT_TRACKING,
    FOLLOW_UP_MANAGEMENT,
    DAILY_PLANNING;

    companion object {
        fun fromString(value: String): WorkflowTemplateType? {
            return values().find { it.name.equals(value, ignoreCase = true) }
        }
    }
}
