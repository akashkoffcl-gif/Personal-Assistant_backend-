package com.nova.companion.workflow.template

import com.nova.companion.workflow.model.WorkflowStepType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class WorkflowTemplateEngineTest {

    private lateinit var engine: WorkflowTemplateEngine

    @Before
    fun setUp() {
        engine = WorkflowTemplateEngine()
    }

    @Test
    fun testMeetingPreparationInstantiation_Success() {
        val result = engine.instantiate(
            templateType = WorkflowTemplateType.MEETING_PREPARATION,
            parameters = mapOf("contact" to "Harish", "meetingTitle" to "Sprint Sync")
        )

        assertTrue(result.isSuccess)
        val workflow = result.getOrThrow()

        assertEquals("Meeting Preparation: Harish", workflow.title)
        assertEquals(5, workflow.steps.size)
        assertEquals("Harish", workflow.metadata["contact"])

        // Validate dependencies correctly mapped
        val stepGenSummary = workflow.steps.find { it.stepType == WorkflowStepType.GENERATE_SUMMARY }
        assertNotNull(stepGenSummary)
        assertEquals(2, stepGenSummary!!.dependsOn.size)

        val stepQueryTasks = workflow.steps.find { it.stepType == WorkflowStepType.QUERY_TASKS }
        val stepQueryCommitments = workflow.steps.find { it.stepType == WorkflowStepType.QUERY_COMMITMENTS }

        assertTrue(stepGenSummary.dependsOn.contains(stepQueryTasks!!.stepId))
        assertTrue(stepGenSummary.dependsOn.contains(stepQueryCommitments!!.stepId))
    }

    @Test
    fun testMeetingPreparationInstantiation_MissingRequiredParam_Fails() {
        val result = engine.instantiate(
            templateType = WorkflowTemplateType.MEETING_PREPARATION,
            parameters = emptyMap()
        )

        assertFalse(result.isSuccess)
        val errorMsg = result.exceptionOrNull()?.message
        assertTrue(errorMsg?.contains("Missing required parameters") == true)
        assertTrue(errorMsg?.contains("contact") == true)
    }

    @Test
    fun testCommitmentTrackingInstantiation_Success() {
        val result = engine.instantiate(
            templateType = WorkflowTemplateType.COMMITMENT_TRACKING,
            parameters = mapOf("contact" to "Dev Team")
        )

        assertTrue(result.isSuccess)
        val workflow = result.getOrThrow()

        assertEquals(4, workflow.steps.size)
        val validation = workflow.validate()
        assertTrue(validation.isValid)
    }

    @Test
    fun testDailyPlanningInstantiation_Success() {
        val result = engine.instantiate(
            templateType = WorkflowTemplateType.DAILY_PLANNING
        )

        assertTrue(result.isSuccess)
        val workflow = result.getOrThrow()

        assertEquals(4, workflow.steps.size)
        val validation = workflow.validate()
        assertTrue(validation.isValid)

        val summaryStep = workflow.steps.find { it.stepType == WorkflowStepType.GENERATE_SUMMARY }
        assertNotNull(summaryStep)
        assertEquals(3, summaryStep!!.dependsOn.size)
    }
}
