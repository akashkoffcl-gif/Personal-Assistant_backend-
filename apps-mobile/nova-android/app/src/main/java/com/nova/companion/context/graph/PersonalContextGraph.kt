package com.nova.companion.context.graph

enum class EntityType {
    PERSON,
    TASK,
    COMMITMENT,
    EVENT,
    CONVERSATION,
    WORKFLOW
}

enum class RelationshipType {
    PARTICIPATES_IN,
    GENERATED,
    RELATED_TO,
    DEPENDS_ON,
    OWNS,
    EXPECTED_TO_RESPOND,
    ASSOCIATED_WITH
}

data class GraphEdge(
    val fromId: String,
    val fromType: EntityType,
    val relationship: RelationshipType,
    val toId: String,
    val toType: EntityType,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * PersonalContextGraph
 *
 * Maintains typed relationships between people, tasks, commitments, and events.
 */
object PersonalContextGraph {

    private val edges = mutableListOf<GraphEdge>()

    fun addEdge(edge: GraphEdge) {
        synchronized(edges) {
            val exists = edges.any {
                it.fromId == edge.fromId && it.relationship == edge.relationship && it.toId == edge.toId
            }
            if (!exists) {
                edges.add(edge)
            }
        }
    }

    fun getEdgesForEntity(entityId: String): List<GraphEdge> {
        synchronized(edges) {
            return edges.filter { it.fromId == entityId || it.toId == entityId }
        }
    }

    fun clear() {
        synchronized(edges) {
            edges.clear()
        }
    }
}
