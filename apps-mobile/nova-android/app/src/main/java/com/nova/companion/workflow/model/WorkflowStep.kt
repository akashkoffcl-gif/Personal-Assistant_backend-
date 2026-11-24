package com.nova.companion.workflow.model

import java.util.UUID

/**
 * WorkflowStep
 *
 * Immutable/versioned definition of an individual unit of work inside a PersonalWorkflow.
 */
data class WorkflowStep(
    val stepId: String = UUID.randomUUID().toString(),
    val workflowId: String,
    val sequence: Int,
    val title: String,
    val description: String? = null,
    val stepType: WorkflowStepType,
    val status: StepStatus = StepStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val startedAt: Long? = null,
    val completedAt: Long? = null,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val dependsOn: List<String> = emptyList(), // stepIds required to complete first
    val input: Map<String, String> = emptyMap(),
    val output: Map<String, String> = emptyMap(),
    val requiresApproval: Boolean = false,
    val failureReason: String? = null
)
