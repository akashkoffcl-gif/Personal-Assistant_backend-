package com.nova.companion.workflow.model

/**
 * High-level status of a PersonalWorkflow.
 */
enum class WorkflowStatus {
    DRAFT,
    READY,
    RUNNING,
    WAITING_FOR_USER,
    WAITING_APPROVAL,
    PAUSED,
    COMPLETED,
    FAILED,
    CANCELLED;

    fun isTerminal(): Boolean = this in listOf(COMPLETED, FAILED, CANCELLED)
    fun isExecutable(): Boolean = this in listOf(READY, RUNNING)
}

/**
 * Status of an individual step within a PersonalWorkflow.
 */
enum class StepStatus {
    PENDING,
    READY,
    RUNNING,
    WAITING,
    COMPLETED,
    FAILED,
    SKIPPED,
    CANCELLED;

    fun isTerminal(): Boolean = this in listOf(COMPLETED, FAILED, SKIPPED, CANCELLED)
    fun isExecutable(): Boolean = this in listOf(READY, RUNNING)
}

/**
 * Allowed step execution types in Phase 69.5.
 */
enum class WorkflowStepType {
    READ_CONTEXT,
    QUERY_TASKS,
    QUERY_COMMITMENTS,
    QUERY_CALENDAR,
    GENERATE_SUMMARY,
    WAIT_FOR_USER,
    USER_CONFIRMATION,
    NO_OP
}

/**
 * Origin of the workflow.
 */
enum class WorkflowSource {
    USER,
    ASSISTANT,
    SYSTEM
}
