package com.nova.companion.workflow.handler

import com.nova.companion.workflow.model.PersonalWorkflow
import com.nova.companion.workflow.model.WorkflowStep

/**
 * Result of executing a WorkflowStep.
 */
sealed class WorkflowStepResult {
    data class Success(
        val output: Map<String, String> = emptyMap()
    ) : WorkflowStepResult()

    data class Failure(
        val reason: String,
        val isRecoverable: Boolean = true
    ) : WorkflowStepResult()

    data class WaitForUser(
        val prompt: String,
        val expectedInputKey: String
    ) : WorkflowStepResult()

    data class RequireConfirmation(
        val message: String
    ) : WorkflowStepResult()
}

/**
 * Interface for modular, testable step execution.
 */
interface WorkflowStepHandler {
    suspend fun execute(
        workflow: PersonalWorkflow,
        step: WorkflowStep
    ): WorkflowStepResult
}
