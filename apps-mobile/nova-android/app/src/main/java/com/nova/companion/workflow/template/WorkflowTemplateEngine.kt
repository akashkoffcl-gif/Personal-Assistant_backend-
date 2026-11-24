package com.nova.companion.workflow.template

import com.nova.companion.workflow.model.PersonalWorkflow
import com.nova.companion.workflow.model.StepStatus
import com.nova.companion.workflow.model.WorkflowSource
import com.nova.companion.workflow.model.WorkflowStatus
import com.nova.companion.workflow.model.WorkflowStep
import java.util.UUID

/**
 * WorkflowTemplateEngine
 *
 * Instantiates deterministic [PersonalWorkflow] DAG instances from [WorkflowTemplate] definitions
 * with parameter validation and proper dependency wiring.
 */
class WorkflowTemplateEngine(
    private val registry: WorkflowTemplateRegistry = WorkflowTemplateRegistry
) {

    /**
     * Instantiates a workflow DAG from a template.
     */
    fun instantiate(
        templateType: WorkflowTemplateType,
        parameters: Map<String, String> = emptyMap(),
        customTitle: String? = null
    ): Result<PersonalWorkflow> {
        val template = registry.getTemplateByType(templateType)
            ?: return Result.failure(IllegalArgumentException("Template not found for type: $templateType"))

        return instantiate(template, parameters, customTitle)
    }

    /**
     * Instantiates a workflow DAG from a template ID.
     */
    fun instantiate(
        templateId: String,
        parameters: Map<String, String> = emptyMap(),
        customTitle: String? = null
    ): Result<PersonalWorkflow> {
        val template = registry.getTemplate(templateId)
            ?: return Result.failure(IllegalArgumentException("Template not found: $templateId"))

        return instantiate(template, parameters, customTitle)
    }

    /**
     * Core instantiation logic.
     */
    fun instantiate(
        template: WorkflowTemplate,
        parameters: Map<String, String> = emptyMap(),
        customTitle: String? = null
    ): Result<PersonalWorkflow> {
        // 1. Parameter Validation
        val validation = template.validateParameters(parameters)
        if (!validation.isValid) {
            return Result.failure(IllegalArgumentException(validation.errorMessage ?: "Invalid parameters"))
        }

        val workflowId = UUID.randomUUID().toString()
        val title = customTitle ?: "${template.name}: ${parameters["contact"] ?: "Overview"}"

        // 2. Map Step Template IDs to Concrete UUIDs to resolve dependencies accurately
        val templateStepIdToUuid = template.stepTemplates.associate { it.templateStepId to UUID.randomUUID().toString() }

        // 3. Build concrete WorkflowSteps
        val steps = template.stepTemplates.map { stepTmpl ->
            val stepId = templateStepIdToUuid[stepTmpl.templateStepId] ?: UUID.randomUUID().toString()
            val concreteDependencies = stepTmpl.dependsOnTemplateStepIds.mapNotNull { templateStepIdToUuid[it] }

            // Merge default input with provided workflow parameters
            val mergedInput = stepTmpl.defaultInput.toMutableMap().apply {
                putAll(parameters)
            }

            WorkflowStep(
                stepId = stepId,
                workflowId = workflowId,
                sequence = stepTmpl.sequence,
                title = stepTmpl.title,
                description = stepTmpl.description,
                stepType = stepTmpl.stepType,
                status = StepStatus.PENDING,
                dependsOn = concreteDependencies,
                input = mergedInput,
                output = emptyMap(),
                requiresApproval = stepTmpl.requiresApproval
            )
        }

        // 4. Construct Workflow aggregate
        val workflow = PersonalWorkflow(
            workflowId = workflowId,
            title = title,
            description = template.description,
            status = WorkflowStatus.READY,
            steps = steps,
            source = WorkflowSource.SYSTEM,
            priority = template.defaultPriority,
            metadata = parameters.toMutableMap().apply {
                put("templateId", template.templateId)
                put("templateType", template.type.name)
            }
        )

        // 5. Structural validation
        val structValidation = workflow.validate()
        if (!structValidation.isValid) {
            return Result.failure(IllegalStateException("Workflow DAG validation failed: ${structValidation.error}"))
        }

        return Result.success(workflow)
    }
}
