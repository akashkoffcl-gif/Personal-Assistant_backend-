package com.nova.companion.workflow.persistence

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.nova.companion.workflow.model.PersonalWorkflow
import java.util.concurrent.ConcurrentHashMap

/**
 * Robust, synchronized, versioned storage for workflows.
 * Survives process restarts and app lifecycle transitions.
 */
class WorkflowPersistenceStore(private val context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()
    private val memoryCache = ConcurrentHashMap<String, PersonalWorkflow>()

    companion object {
        private const val TAG = "WorkflowPersistence"
        private const val PREFS_NAME = "nova_workflow_orchestration_prefs"
        private const val KEY_WORKFLOWS_JSON = "saved_workflows_json"
        private const val KEY_SCHEMA_VERSION = "schema_version"
        private const val CURRENT_SCHEMA_VERSION = 1
    }

    init {
        loadFromDisk()
    }

    @Synchronized
    fun saveWorkflow(workflow: PersonalWorkflow) {
        memoryCache[workflow.workflowId] = workflow
        flushToDisk()
    }

    fun getWorkflow(workflowId: String): PersonalWorkflow? {
        return memoryCache[workflowId]
    }

    fun getAllWorkflows(): List<PersonalWorkflow> {
        return memoryCache.values.toList()
    }

    @Synchronized
    fun deleteWorkflow(workflowId: String): Boolean {
        val removed = memoryCache.remove(workflowId) != null
        if (removed) {
            flushToDisk()
        }
        return removed
    }

    @Synchronized
    fun clear() {
        memoryCache.clear()
        prefs.edit().clear().apply()
    }

    @Synchronized
    private fun flushToDisk() {
        try {
            val list = memoryCache.values.toList()
            val json = gson.toJson(list)
            prefs.edit()
                .putString(KEY_WORKFLOWS_JSON, json)
                .putInt(KEY_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error saving workflows to SharedPreferences", e)
        }
    }

    private fun loadFromDisk() {
        try {
            val json = prefs.getString(KEY_WORKFLOWS_JSON, null) ?: return
            val type = object : TypeToken<List<PersonalWorkflow>>() {}.type
            val list: List<PersonalWorkflow> = gson.fromJson(json, type) ?: return
            for (wf in list) {
                memoryCache[wf.workflowId] = wf
            }
            Log.d(TAG, "Successfully loaded ${memoryCache.size} workflows from disk.")
        } catch (e: Exception) {
            Log.e(TAG, "Error loading workflows from disk", e)
        }
    }
}
