# Intent Understanding Design & Specification

## 1. Intent Taxonomy
The system categorizes incoming user utterances into 12 structured intents:
1. `QUESTION`: Direct inquiries for information or platform status.
2. `REQUEST_ACTION`: Explicit commands requiring mutations.
3. `INSTRUCTION`: Structured instructions (e.g. "plan my day").
4. `SUGGESTION`: User proposals for assistant adaptation.
5. `COMPLAINT_OR_FRUSTRATION`: Statements expressing stress or blockers.
6. `PREFERENCE_STATEMENT`: Direct declaration of habits or styles.
7. `CORRECTION`: Direct refutation or refinement of previous turns.
8. `FOLLOW_UP`: Anaphoric inquiries continuing the active thread.
9. `REQUEST_ADVICE`: Inquiries asking for prioritization or tactical direction.
10. `EMOTIONAL_DISCLOSURE`: Personal sharing requiring empathetic listening.
11. `CONTEXT_STATEMENT`: Declarations establishing working domain.
12. `IMPLICIT_ASSISTANCE_REQUEST`: Expressions of overwhelm or high workload.

## 2. Decision Policy Framework
Prior to tool invocation or action generation, one of seven policies is bound:
- `DIRECT_ANSWER`: Rapid, factual response without mutations.
- `CONTEXTUAL_RESPONSE`: Conversational answer grounded in multi-turn history.
- `RECOMMENDATION`: Prioritized advice and next-step proposals.
- `CLARIFICATION`: Targeted question to resolve ambiguity.
- `PLAN`: Complex DAG formulation via smart planner.
- `ACTION`: Execution of an authorized tool via Jarvis registry.
- `PROACTIVE_SUGGESTION`: Proactive suggestion without unsolicited mutation.

