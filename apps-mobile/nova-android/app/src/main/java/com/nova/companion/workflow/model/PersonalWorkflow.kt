package com.nova.companion.workflow.model

import java.util.UUID

/**
 * PersonalWorkflow
 *
 * Persistent, deterministic aggregate root representing a multi-step workflow.
 */
data class PersonalWorkflow(
    val workflowId: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String? = null,
    val status: WorkflowStatus = WorkflowStatus.DRAFT,
    val steps: List<WorkflowStep> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val currentStepIndex: Int = 0,
    val source: WorkflowSource = WorkflowSource.USER,
    val priority: Int = 0, // 0=default, 1=urgent, 2=critical
    val metadata: Map<String, String> = emptyMap(),
    val failureReason: String? = null,
    val completedAt: Long? = null,
    val schemaVersion: Int = 1
) {
    /**
     * Validates structural integrity of workflow and steps:
     * - Checks for unique step IDs
     * - Checks that dependencies point to valid prior steps
     * - Checks for absence of circular dependencies
     */
    fun validate(): ValidationResult {
        if (title.isBlank()) {
            return ValidationResult(false, "Workflow title cannot be blank")
        }
        val stepIds = steps.map { it.stepId }.toSet()
        if (stepIds.size != steps.size) {
            return ValidationResult(false, "Duplicate step IDs detected")
        }
        for (step in steps) {
            for (dep in step.dependsOn) {
                if (dep == step.stepId) {
                    return ValidationResult(false, "Step ${step.stepId} cannot depend on itself")
                }
                if (!stepIds.contains(dep)) {
                    return ValidationResult(false, "Step ${step.stepId} references missing dependency $dep")
                }
            }
        }
        // Cycle check
        val visited = mutableSetOf<String>()
        val recStack = mutableSetOf<String>()
        fun hasCycle(sId: String): Boolean {
            if (recStack.contains(sId)) return true
            if (visited.contains(sId)) return false
            visited.add(sId)
            recStack.add(sId)
            val st = steps.firstOrNull { it.stepId == sId }
            if (st != null) {
                for (dep in st.dependsOn) {
                    if (hasCycle(dep)) return true
                }
            }
            recStack.remove(sId)
            return false
        }
        for (step in steps) {
            if (hasCycle(step.stepId)) {
                return ValidationResult(false, "Circular dependency detected involving step ${step.stepId}")
            }
        }
        return ValidationResult(true)
    }
}

data class ValidationResult(
    val isValid: Boolean,
    val error: String? = null
)
