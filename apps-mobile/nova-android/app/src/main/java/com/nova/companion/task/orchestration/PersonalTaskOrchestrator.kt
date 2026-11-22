package com.nova.companion.task.orchestration

import java.util.concurrent.ConcurrentHashMap

/**
 * PersonalTaskOrchestrator
 *
 * Manages task CRUD, prioritization, status lifecycle, and retrieval.
 */
object PersonalTaskOrchestrator {

    private val tasksById = ConcurrentHashMap<String, PersonalTask>()

    fun addTask(task: PersonalTask) {
        // Prevent duplicate tasks for same contact and title
        val existing = tasksById.values.firstOrNull {
            it.associatedContact.equals(task.associatedContact, ignoreCase = true) &&
                    it.title.equals(task.title, ignoreCase = true) &&
                    it.status == TaskStatus.PENDING
        }
        if (existing == null) {
            tasksById[task.id] = task
        }
    }

    fun completeTask(id: String): Boolean {
        val task = tasksById[id] ?: return false
        task.status = TaskStatus.COMPLETED
        task.updatedAt = System.currentTimeMillis()
        return true
    }

    fun cancelTask(id: String): Boolean {
        val task = tasksById[id] ?: return false
        task.status = TaskStatus.CANCELLED
        task.updatedAt = System.currentTimeMillis()
        return true
    }

    fun getPendingTasks(): List<PersonalTask> {
        return tasksById.values
            .filter { it.status == TaskStatus.PENDING || it.status == TaskStatus.IN_PROGRESS }
            .sortedBy { it.priorityRank }
    }

    fun getTodayTasks(): List<PersonalTask> {
        return getPendingTasks()
    }

    fun getCompletedTasks(): List<PersonalTask> {
        return tasksById.values.filter { it.status == TaskStatus.COMPLETED }
    }

    fun findTasksForContact(contact: String): List<PersonalTask> {
        val c = contact.lowercase().trim()
        return tasksById.values.filter { it.associatedContact?.lowercase()?.contains(c) == true }
    }

    fun clear() {
        tasksById.clear()
    }
}
