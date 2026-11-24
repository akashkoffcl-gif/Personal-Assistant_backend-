package com.nova.companion.workflow

import com.nova.companion.workflow.model.PersonalWorkflow
import com.nova.companion.workflow.model.StepStatus
import com.nova.companion.workflow.model.WorkflowStatus
import com.nova.companion.workflow.model.WorkflowStep
import com.nova.companion.workflow.model.WorkflowStepType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PersonalWorkflowModelTest {

    @Test
    fun testValidWorkflowCreation() {
        val step1 = WorkflowStep(
            stepId = "step-1",
            workflowId = "wf-1",
            sequence = 0,
            title = "Read context",
            stepType = WorkflowStepType.READ_CONTEXT
        )
        val step2 = WorkflowStep(
            stepId = "step-2",
            workflowId = "wf-1",
            sequence = 1,
            title = "Generate summary",
            stepType = WorkflowStepType.GENERATE_SUMMARY,
            dependsOn = listOf("step-1")
        )

        val wf = PersonalWorkflow(
            workflowId = "wf-1",
            title = "Morning Workflow",
            steps = listOf(step1, step2)
        )

        val validation = wf.validate()
        assertTrue(validation.isValid)
    }

    @Test
    fun testBlankTitleValidation() {
        val wf = PersonalWorkflow(
            workflowId = "wf-invalid",
            title = "",
            steps = emptyList()
        )
        val validation = wf.validate()
        assertFalse(validation.isValid)
        assertEquals("Workflow title cannot be blank", validation.error)
    }

    @Test
    fun testDuplicateStepIdValidation() {
        val step1 = WorkflowStep(stepId = "step-dup", workflowId = "wf-1", sequence = 0, title = "Step 1", stepType = WorkflowStepType.NO_OP)
        val step2 = WorkflowStep(stepId = "step-dup", workflowId = "wf-1", sequence = 1, title = "Step 2", stepType = WorkflowStepType.NO_OP)

        val wf = PersonalWorkflow(
            workflowId = "wf-1",
            title = "Duplicate Test",
            steps = listOf(step1, step2)
        )
        val validation = wf.validate()
        assertFalse(validation.isValid)
        assertEquals("Duplicate step IDs detected", validation.error)
    }

    @Test
    fun testSelfDependencyValidation() {
        val step1 = WorkflowStep(
            stepId = "step-self",
            workflowId = "wf-1",
            sequence = 0,
            title = "Self Step",
            stepType = WorkflowStepType.NO_OP,
            dependsOn = listOf("step-self")
        )
        val wf = PersonalWorkflow(workflowId = "wf-1", title = "Self Dep", steps = listOf(step1))
        val validation = wf.validate()
        assertFalse(validation.isValid)
        assertTrue(validation.error?.contains("cannot depend on itself") == true)
    }

    @Test
    fun testMissingDependencyValidation() {
        val step1 = WorkflowStep(
            stepId = "step-1",
            workflowId = "wf-1",
            sequence = 0,
            title = "Step 1",
            stepType = WorkflowStepType.NO_OP,
            dependsOn = listOf("missing-step")
        )
        val wf = PersonalWorkflow(workflowId = "wf-1", title = "Missing Dep", steps = listOf(step1))
        val validation = wf.validate()
        assertFalse(validation.isValid)
        assertTrue(validation.error?.contains("references missing dependency") == true)
    }

    @Test
    fun testCircularDependencyValidation() {
        val stepA = WorkflowStep(
            stepId = "step-A",
            workflowId = "wf-1",
            sequence = 0,
            title = "Step A",
            stepType = WorkflowStepType.NO_OP,
            dependsOn = listOf("step-B")
        )
        val stepB = WorkflowStep(
            stepId = "step-B",
            workflowId = "wf-1",
            sequence = 1,
            title = "Step B",
            stepType = WorkflowStepType.NO_OP,
            dependsOn = listOf("step-A")
        )
        val wf = PersonalWorkflow(workflowId = "wf-1", title = "Cycle", steps = listOf(stepA, stepB))
        val validation = wf.validate()
        assertFalse(validation.isValid)
        assertTrue(validation.error?.contains("Circular dependency detected") == true)
    }

    @Test
    fun testWorkflowStatusHelperMethods() {
        assertTrue(WorkflowStatus.COMPLETED.isTerminal())
        assertTrue(WorkflowStatus.FAILED.isTerminal())
        assertTrue(WorkflowStatus.CANCELLED.isTerminal())
        assertFalse(WorkflowStatus.RUNNING.isTerminal())
        assertFalse(WorkflowStatus.READY.isTerminal())

        assertTrue(StepStatus.COMPLETED.isTerminal())
        assertTrue(StepStatus.SKIPPED.isTerminal())
        assertFalse(StepStatus.READY.isTerminal())
        assertFalse(StepStatus.PENDING.isTerminal())
    }
}
