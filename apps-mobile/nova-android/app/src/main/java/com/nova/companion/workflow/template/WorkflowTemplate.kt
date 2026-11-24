package com.nova.companion.workflow.template

import com.nova.companion.workflow.model.WorkflowStepType

/**
 * WorkflowStepTemplate
 *
 * Definition of a step within a WorkflowTemplate prior to instantiation.
 */
data class WorkflowStepTemplate(
    val templateStepId: String,
    val sequence: Int,
    val title: String,
    val description: String? = null,
    val stepType: WorkflowStepType,
    val dependsOnTemplateStepIds: List<String> = emptyList(),
    val defaultInput: Map<String, String> = emptyMap(),
    val requiresApproval: Boolean = false
)

/**
 * WorkflowTemplate
 *
 * Immutable specification representing a reusable personal workflow pattern.
 */
data class WorkflowTemplate(
    val templateId: String,
    val type: WorkflowTemplateType,
    val name: String,
    val description: String,
    val requiredParameters: List<String> = emptyList(),
    val optionalParameters: List<String> = emptyList(),
    val stepTemplates: List<WorkflowStepTemplate> = emptyList(),
    val defaultPriority: Int = 0
) {
    /**
     * Validates if provided parameters satisfy this template's requirements.
     */
    fun validateParameters(parameters: Map<String, String>): TemplateValidationResult {
        val missing = requiredParameters.filter { !parameters.containsKey(it) || parameters[it].isNullOrBlank() }
        return if (missing.isEmpty()) {
            TemplateValidationResult(isValid = true)
        } else {
            TemplateValidationResult(
                isValid = false,
                errorMessage = "Missing required parameters for template $name: ${missing.joinToString(", ")}"
            )
        }
    }
}

data class TemplateValidationResult(
    val isValid: Boolean,
    val errorMessage: String? = null
)
