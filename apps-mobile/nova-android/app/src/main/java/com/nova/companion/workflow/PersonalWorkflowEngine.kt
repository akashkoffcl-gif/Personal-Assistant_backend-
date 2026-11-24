package com.nova.companion.workflow

import android.content.Context
import android.util.Log
import com.nova.companion.workflow.handler.WorkflowStepHandlerRegistry
import com.nova.companion.workflow.handler.WorkflowStepResult
import com.nova.companion.workflow.model.PersonalWorkflow
import com.nova.companion.workflow.model.StepStatus
import com.nova.companion.workflow.model.ValidationResult
import com.nova.companion.workflow.model.WorkflowStatus
import com.nova.companion.workflow.model.WorkflowStep
import com.nova.companion.workflow.persistence.WorkflowPersistenceStore
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * PersonalWorkflowEngine
 *
 * Core engine orchestrating multi-step personal workflows deterministically with
 * full process recovery, state persistence, and dependency resolution.
 */
class PersonalWorkflowEngine(
    private val context: Context,
    private val persistenceStore: WorkflowPersistenceStore = WorkflowPersistenceStore(context),
    private val handlerRegistry: WorkflowStepHandlerRegistry = WorkflowStepHandlerRegistry(context)
) {

    private val engineMutex = Mutex()

    companion object {
        private const val TAG = "PersonalWorkflowEngine"
    }

    /**
     * Creates and registers a new workflow after strict validation.
     */
    suspend fun createWorkflow(workflow: PersonalWorkflow): Result<PersonalWorkflow> = engineMutex.withLock {
        val validation = workflow.validate()
        if (!validation.isValid) {
            Log.w(TAG, "Workflow validation failed: ${validation.error}")
            return@withLock Result.failure(IllegalArgumentException(validation.error ?: "Invalid workflow"))
        }

        // Initialize steps in PENDING state
        val initialSteps = workflow.steps.mapIndexed { index, step ->
            step.copy(
                workflowId = workflow.workflowId,
                sequence = index,
                status = if (index == 0 && step.dependsOn.isEmpty()) StepStatus.READY else StepStatus.PENDING
            )
        }

        val initializedWorkflow = workflow.copy(
            status = WorkflowStatus.READY,
            steps = initialSteps,
            currentStepIndex = 0,
            updatedAt = System.currentTimeMillis()
        )

        persistenceStore.saveWorkflow(initializedWorkflow)
        Log.i(TAG, "WORKFLOW_CREATED: [${initializedWorkflow.workflowId}] - ${initializedWorkflow.title}")
        return@withLock Result.success(initializedWorkflow)
    }

    /**
     * Starts or initiates execution of a workflow.
     */
    suspend fun startWorkflow(workflowId: String): Result<PersonalWorkflow> {
        val wf = persistenceStore.getWorkflow(workflowId)
            ?: return Result.failure(NoSuchElementException("Workflow $workflowId not found"))

        if (wf.status != WorkflowStatus.READY && wf.status != WorkflowStatus.PAUSED) {
            return Result.failure(IllegalStateException("Cannot start workflow in status ${wf.status}"))
        }

        val runningWf = wf.copy(
            status = WorkflowStatus.RUNNING,
            updatedAt = System.currentTimeMillis()
        )
        persistenceStore.saveWorkflow(runningWf)
        Log.i(TAG, "WORKFLOW_STARTED: [$workflowId]")

        return executeNextStep(workflowId)
    }

    /**
     * Resumes a paused or waiting workflow.
     */
    suspend fun resumeWorkflow(workflowId: String): Result<PersonalWorkflow> {
        val wf = persistenceStore.getWorkflow(workflowId)
            ?: return Result.failure(NoSuchElementException("Workflow $workflowId not found"))

        if (wf.status != WorkflowStatus.PAUSED && wf.status != WorkflowStatus.WAITING_FOR_USER) {
            return Result.failure(IllegalStateException("Cannot resume workflow in status ${wf.status}"))
        }

        val resumed = wf.copy(
            status = WorkflowStatus.RUNNING,
            updatedAt = System.currentTimeMillis()
        )
        persistenceStore.saveWorkflow(resumed)
        Log.i(TAG, "WORKFLOW_RESUMED: [$workflowId]")
        return executeNextStep(workflowId)
    }

    /**
     * Pauses an active workflow.
     */
    suspend fun pauseWorkflow(workflowId: String): Result<PersonalWorkflow> = engineMutex.withLock {
        val wf = persistenceStore.getWorkflow(workflowId)
            ?: return@withLock Result.failure(NoSuchElementException("Workflow $workflowId not found"))

        if (wf.status.isTerminal()) {
            return@withLock Result.failure(IllegalStateException("Cannot pause terminal workflow"))
        }

        val paused = wf.copy(
            status = WorkflowStatus.PAUSED,
            updatedAt = System.currentTimeMillis()
        )
        persistenceStore.saveWorkflow(paused)
        Log.i(TAG, "WORKFLOW_PAUSED: [$workflowId]")
        return@withLock Result.success(paused)
    }

    /**
     * Cancels an active workflow.
     */
    suspend fun cancelWorkflow(workflowId: String): Result<PersonalWorkflow> = engineMutex.withLock {
        val wf = persistenceStore.getWorkflow(workflowId)
            ?: return@withLock Result.failure(NoSuchElementException("Workflow $workflowId not found"))

        val cancelledSteps = wf.steps.map { step ->
            if (!step.status.isTerminal()) step.copy(status = StepStatus.CANCELLED) else step
        }
        val cancelled = wf.copy(
            status = WorkflowStatus.CANCELLED,
            steps = cancelledSteps,
            updatedAt = System.currentTimeMillis()
        )
        persistenceStore.saveWorkflow(cancelled)
        Log.i(TAG, "WORKFLOW_CANCELLED: [$workflowId]")
        return@withLock Result.success(cancelled)
    }

    /**
     * Executes the next eligible step deterministically.
     */
    suspend fun executeNextStep(workflowId: String): Result<PersonalWorkflow> = engineMutex.withLock {
        var wf = persistenceStore.getWorkflow(workflowId)
            ?: return@withLock Result.failure(NoSuchElementException("Workflow $workflowId not found"))

        if (wf.status != WorkflowStatus.RUNNING) {
            return@withLock Result.success(wf)
        }

        // Find next eligible step
        val completedStepIds = wf.steps.filter { it.status == StepStatus.COMPLETED }.map { it.stepId }.toSet()
        val candidateStep = wf.steps.firstOrNull { step ->
            step.status != StepStatus.COMPLETED &&
                    step.status != StepStatus.SKIPPED &&
                    step.status != StepStatus.FAILED &&
                    step.status != StepStatus.CANCELLED &&
                    step.dependsOn.all { completedStepIds.contains(it) }
        }

        // If no more steps to execute, mark workflow completed
        if (candidateStep == null) {
            val allTerminal = wf.steps.all { it.status.isTerminal() }
            val hasFailed = wf.steps.any { it.status == StepStatus.FAILED }

            val finalWf = wf.copy(
                status = if (hasFailed) WorkflowStatus.FAILED else WorkflowStatus.COMPLETED,
                completedAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            persistenceStore.saveWorkflow(finalWf)
            Log.i(TAG, "WORKFLOW_COMPLETED: [$workflowId] Status=${finalWf.status}")
            return@withLock Result.success(finalWf)
        }

        // Mark step RUNNING
        val runningStep = candidateStep.copy(
            status = StepStatus.RUNNING,
            startedAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        wf = updateStepInWorkflow(wf, runningStep)
        persistenceStore.saveWorkflow(wf)
        Log.i(TAG, "WORKFLOW_STEP_STARTED: [${runningStep.stepId}] Type=${runningStep.stepType}")

        // Execute Handler
        val handler = handlerRegistry.getHandler(runningStep.stepType)
        if (handler == null) {
            val failedStep = runningStep.copy(
                status = StepStatus.FAILED,
                failureReason = "No handler registered for ${runningStep.stepType}"
            )
            val updatedWf = updateStepInWorkflow(wf, failedStep).copy(
                status = WorkflowStatus.FAILED,
                failureReason = failedStep.failureReason
            )
            persistenceStore.saveWorkflow(updatedWf)
            return@withLock Result.success(updatedWf)
        }

        val stepResult = try {
            handler.execute(wf, runningStep)
        } catch (e: Exception) {
            Log.e(TAG, "Exception executing step ${runningStep.stepId}", e)
            WorkflowStepResult.Failure(e.message ?: "Unknown error", isRecoverable = true)
        }

        // Process Result
        return@withLock when (stepResult) {
            is WorkflowStepResult.Success -> {
                val completedStep = runningStep.copy(
                    status = StepStatus.COMPLETED,
                    output = stepResult.output,
                    completedAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
                val updatedWf = updateStepInWorkflow(wf, completedStep)
                persistenceStore.saveWorkflow(updatedWf)
                Log.i(TAG, "WORKFLOW_STEP_COMPLETED: [${completedStep.stepId}]")

                // Immediately trigger next step evaluation
                executeNextStepInternal(updatedWf.workflowId)
            }
            is WorkflowStepResult.Failure -> {
                val canRetry = stepResult.isRecoverable && runningStep.retryCount < runningStep.maxRetries
                val updatedStep = if (canRetry) {
                    runningStep.copy(
                        status = StepStatus.READY,
                        retryCount = runningStep.retryCount + 1,
                        failureReason = stepResult.reason,
                        updatedAt = System.currentTimeMillis()
                    )
                } else {
                    runningStep.copy(
                        status = StepStatus.FAILED,
                        failureReason = stepResult.reason,
                        updatedAt = System.currentTimeMillis()
                    )
                }
                val updatedWf = updateStepInWorkflow(wf, updatedStep).copy(
                    status = if (canRetry) WorkflowStatus.RUNNING else WorkflowStatus.FAILED,
                    failureReason = if (!canRetry) stepResult.reason else null
                )
                persistenceStore.saveWorkflow(updatedWf)
                Log.w(TAG, "WORKFLOW_STEP_FAILED: [${updatedStep.stepId}] Reason=${stepResult.reason} CanRetry=$canRetry")
                Result.success(updatedWf)
            }
            is WorkflowStepResult.WaitForUser -> {
                val waitingStep = runningStep.copy(
                    status = StepStatus.WAITING,
                    updatedAt = System.currentTimeMillis()
                )
                val updatedWf = updateStepInWorkflow(wf, waitingStep).copy(
                    status = WorkflowStatus.WAITING_FOR_USER,
                    updatedAt = System.currentTimeMillis()
                )
                persistenceStore.saveWorkflow(updatedWf)
                Log.i(TAG, "WORKFLOW_WAITING_FOR_USER: [$workflowId] Prompt=${stepResult.prompt}")
                Result.success(updatedWf)
            }
            is WorkflowStepResult.RequireConfirmation -> {
                val waitingStep = runningStep.copy(
                    status = StepStatus.WAITING,
                    updatedAt = System.currentTimeMillis()
                )
                val updatedWf = updateStepInWorkflow(wf, waitingStep).copy(
                    status = WorkflowStatus.WAITING_APPROVAL,
                    updatedAt = System.currentTimeMillis()
                )
                persistenceStore.saveWorkflow(updatedWf)
                Log.i(TAG, "WORKFLOW_WAITING_APPROVAL: [$workflowId] Message=${stepResult.message}")
                Result.success(updatedWf)
            }
        }
    }

    private suspend fun executeNextStepInternal(workflowId: String): Result<PersonalWorkflow> {
        val wf = persistenceStore.getWorkflow(workflowId) ?: return Result.failure(NoSuchElementException())
        if (wf.status != WorkflowStatus.RUNNING) return Result.success(wf)

        val completedStepIds = wf.steps.filter { it.status == StepStatus.COMPLETED }.map { it.stepId }.toSet()
        val candidateStep = wf.steps.firstOrNull { step ->
            step.status != StepStatus.COMPLETED &&
                    step.status != StepStatus.SKIPPED &&
                    step.status != StepStatus.FAILED &&
                    step.status != StepStatus.CANCELLED &&
                    step.dependsOn.all { completedStepIds.contains(it) }
        }

        if (candidateStep == null) {
            val allTerminal = wf.steps.all { it.status.isTerminal() }
            val hasFailed = wf.steps.any { it.status == StepStatus.FAILED }
            val finalWf = wf.copy(
                status = if (hasFailed) WorkflowStatus.FAILED else WorkflowStatus.COMPLETED,
                completedAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            persistenceStore.saveWorkflow(finalWf)
            Log.i(TAG, "WORKFLOW_COMPLETED: [$workflowId] Status=${finalWf.status}")
            return Result.success(finalWf)
        }

        val runningStep = candidateStep.copy(
            status = StepStatus.RUNNING,
            startedAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        val updatedWf = updateStepInWorkflow(wf, runningStep)
        persistenceStore.saveWorkflow(updatedWf)

        val handler = handlerRegistry.getHandler(runningStep.stepType)
            ?: return Result.success(updatedWf.copy(status = WorkflowStatus.FAILED, failureReason = "Missing handler"))

        return when (val stepResult = handler.execute(updatedWf, runningStep)) {
            is WorkflowStepResult.Success -> {
                val completedStep = runningStep.copy(
                    status = StepStatus.COMPLETED,
                    output = stepResult.output,
                    completedAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
                val nextWf = updateStepInWorkflow(updatedWf, completedStep)
                persistenceStore.saveWorkflow(nextWf)
                executeNextStepInternal(workflowId)
            }
            else -> Result.success(updatedWf)
        }
    }

    /**
     * Recovers interrupted workflows after process death or restart.
     */
    suspend fun recoverInterruptedWorkflows(): RecoveryReport = engineMutex.withLock {
        val allWorkflows = persistenceStore.getAllWorkflows()
        var recoveredCount = 0
        var pausedCount = 0

        for (wf in allWorkflows) {
            if (wf.status == WorkflowStatus.RUNNING) {
                // Determine if any step was left RUNNING mid-flight
                val updatedSteps = wf.steps.map { step ->
                    if (step.status == StepStatus.RUNNING) {
                        // Reset interrupted running step to READY for safe replay
                        step.copy(status = StepStatus.READY)
                    } else step
                }
                val recoveredWf = wf.copy(
                    status = WorkflowStatus.READY,
                    steps = updatedSteps,
                    updatedAt = System.currentTimeMillis()
                )
                persistenceStore.saveWorkflow(recoveredWf)
                recoveredCount++
                Log.i(TAG, "WORKFLOW_RECOVERED: [${wf.workflowId}] reset to READY state")
            } else if (wf.status == WorkflowStatus.WAITING_FOR_USER || wf.status == WorkflowStatus.WAITING_APPROVAL) {
                pausedCount++
            }
        }
        return@withLock RecoveryReport(recoveredCount, pausedCount, allWorkflows.size)
    }

    fun getWorkflow(workflowId: String): PersonalWorkflow? = persistenceStore.getWorkflow(workflowId)

    fun getActiveWorkflows(): List<PersonalWorkflow> =
        persistenceStore.getAllWorkflows().filter { !it.status.isTerminal() }

    fun getWorkflowHistory(): List<PersonalWorkflow> =
        persistenceStore.getAllWorkflows().filter { it.status.isTerminal() }

    private fun updateStepInWorkflow(workflow: PersonalWorkflow, updatedStep: WorkflowStep): PersonalWorkflow {
        val newSteps = workflow.steps.map { if (it.stepId == updatedStep.stepId) updatedStep else it }
        val nextIdx = newSteps.indexOfFirst { !it.status.isTerminal() }.let { if (it == -1) newSteps.size else it }
        return workflow.copy(
            steps = newSteps,
            currentStepIndex = nextIdx,
            updatedAt = System.currentTimeMillis()
        )
    }
}

data class RecoveryReport(
    val recoveredCount: Int,
    val pendingInterventionCount: Int,
    val totalWorkflows: Int
)
