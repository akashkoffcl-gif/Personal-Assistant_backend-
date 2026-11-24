package com.nova.companion.workflow.handler

import android.content.Context
import com.nova.companion.calendar.PersonalCalendarEngine
import com.nova.companion.context.UnifiedContextEngine
import com.nova.companion.task.commitment.CommitmentLedgerManager
import com.nova.companion.task.orchestration.PersonalTaskOrchestrator
import com.nova.companion.workflow.model.PersonalWorkflow
import com.nova.companion.workflow.model.WorkflowStep
import com.nova.companion.workflow.model.WorkflowStepType

/**
 * Registry of handlers mapping WorkflowStepType to executable handlers.
 */
class WorkflowStepHandlerRegistry(private val context: Context) {

    private val handlers = mutableMapOf<WorkflowStepType, WorkflowStepHandler>()

    init {
        registerDefaultHandlers()
    }

    fun registerHandler(type: WorkflowStepType, handler: WorkflowStepHandler) {
        handlers[type] = handler
    }

    fun getHandler(type: WorkflowStepType): WorkflowStepHandler? {
        return handlers[type]
    }

    private fun registerDefaultHandlers() {
        // 1. READ_CONTEXT
        registerHandler(WorkflowStepType.READ_CONTEXT, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val contact = step.input["contact"] ?: workflow.metadata["contact"]
                if (contact.isNullOrBlank()) {
                    return WorkflowStepResult.Failure("No contact specified for READ_CONTEXT", isRecoverable = false)
                }
                val snapshot = UnifiedContextEngine.resolveContextForContact(context, contact)
                return WorkflowStepResult.Success(
                    mapOf(
                        "contact" to snapshot.activeContact,
                        "tasksCount" to snapshot.relatedTasks.size.toString(),
                        "commitmentsCount" to snapshot.relatedCommitments.size.toString(),
                        "isWaiting" to snapshot.isWaitingForResponse.toString(),
                        "suggestedNextAction" to (snapshot.suggestedNextAction ?: "None")
                    )
                )
            }
        })

        // 2. QUERY_TASKS
        registerHandler(WorkflowStepType.QUERY_TASKS, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val contact = step.input["contact"] ?: workflow.metadata["contact"]
                val tasks = if (!contact.isNullOrBlank()) {
                    PersonalTaskOrchestrator.findTasksForContact(contact)
                } else {
                    PersonalTaskOrchestrator.getPendingTasks()
                }
                val summary = tasks.joinToString("; ") { "[${it.priorityRank}] ${it.title}" }
                return WorkflowStepResult.Success(
                    mapOf(
                        "taskCount" to tasks.size.toString(),
                        "tasksSummary" to summary
                    )
                )
            }
        })

        // 3. QUERY_COMMITMENTS
        registerHandler(WorkflowStepType.QUERY_COMMITMENTS, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val contact = step.input["contact"] ?: workflow.metadata["contact"]
                val commitments = if (!contact.isNullOrBlank()) {
                    CommitmentLedgerManager.findCommitmentsForContact(contact)
                } else {
                    CommitmentLedgerManager.getActiveCommitments()
                }
                val summary = commitments.joinToString("; ") { "${it.owner}: ${it.description}" }
                return WorkflowStepResult.Success(
                    mapOf(
                        "commitmentCount" to commitments.size.toString(),
                        "commitmentsSummary" to summary
                    )
                )
            }
        })

        // 4. QUERY_CALENDAR
        registerHandler(WorkflowStepType.QUERY_CALENDAR, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val contact = step.input["contact"] ?: workflow.metadata["contact"]
                val event = if (!contact.isNullOrBlank()) {
                    PersonalCalendarEngine.findEventForContact(contact)
                } else {
                    PersonalCalendarEngine.getUpcomingEvents().firstOrNull()
                }
                return if (event != null) {
                    WorkflowStepResult.Success(
                        mapOf(
                            "hasEvent" to "true",
                            "eventId" to event.id,
                            "eventTitle" to event.title,
                            "startTime" to event.startTime.toString()
                        )
                    )
                } else {
                    WorkflowStepResult.Success(
                        mapOf(
                            "hasEvent" to "false",
                            "message" to "No upcoming meetings detected"
                        )
                    )
                }
            }
        })

        // 5. GENERATE_SUMMARY
        registerHandler(WorkflowStepType.GENERATE_SUMMARY, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val inputsCollected = workflow.steps
                    .filter { it.status == com.nova.companion.workflow.model.StepStatus.COMPLETED }
                    .flatMap { it.output.entries }
                    .joinToString(", ") { "${it.key}=${it.value}" }
                val summaryText = "Workflow [${workflow.title}] executed steps with data: $inputsCollected"
                return WorkflowStepResult.Success(
                    mapOf(
                        "summary" to summaryText,
                        "completedSteps" to workflow.steps.count { it.status == com.nova.companion.workflow.model.StepStatus.COMPLETED }.toString()
                    )
                )
            }
        })

        // 6. WAIT_FOR_USER
        registerHandler(WorkflowStepType.WAIT_FOR_USER, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val prompt = step.input["prompt"] ?: "Waiting for user response"
                val expectedKey = step.input["key"] ?: "user_response"
                return WorkflowStepResult.WaitForUser(prompt, expectedKey)
            }
        })

        // 7. USER_CONFIRMATION
        registerHandler(WorkflowStepType.USER_CONFIRMATION, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                val message = step.input["message"] ?: "Please confirm this step to proceed"
                return WorkflowStepResult.RequireConfirmation(message)
            }
        })

        // 8. NO_OP
        registerHandler(WorkflowStepType.NO_OP, object : WorkflowStepHandler {
            override suspend fun execute(workflow: PersonalWorkflow, step: WorkflowStep): WorkflowStepResult {
                return WorkflowStepResult.Success(mapOf("executed" to "true"))
            }
        })
    }
}
