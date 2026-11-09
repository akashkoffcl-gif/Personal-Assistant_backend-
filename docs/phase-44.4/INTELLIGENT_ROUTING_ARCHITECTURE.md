# Intelligent Request Routing Architecture

## 1. Request Intent Classification
Incoming assistant messages pass through an intent classifier in `AIService`:

1. `GENERAL_CONVERSATION`: Freeform dialogue, greetings, personality inquiries.
2. `PERSONAL_DATA_RETRIEVAL`: Schedule review, daily briefings, progress metrics.
3. `KNOWLEDGE_SEARCH`: Second brain notes, research evidence, documentation synthesis.
4. `PLANNING_RECOMMENDATIONS`: Day planning, smart schedule optimization.
5. `TASK_EXECUTION`: Task creation, routine check-in, reminder triggers.
6. `MULTI_STEP_WORKFLOW`: Autonomous schedule restructuring, bulk reorganizations.
7. `FINANCIAL_ANALYSIS`: Budgets, net worth calculations, transaction categorization.
8. `VOICE_INTERACTION`: Concise conversational output optimized for text-to-speech synthesis.

## 2. Safe Separation of Concerns
- **Deterministic Services:** Tasks, Routines, Goals, and Financial tables are accessed exclusively through strict TypeScript domain services.
- **LLM Boundary:** The model does NOT have raw SQL or direct Prisma client access. All mutations require structured proposals and user confirmation.

