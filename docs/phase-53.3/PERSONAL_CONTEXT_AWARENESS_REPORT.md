# Personal Context Awareness Report

**Phase:** 53.3  
**Target:** Validate context synthesis across tasks, projects, schedules, and past decisions.

---

## 1. Unified Domain Synthesis

`ProactiveIntelligenceService` gathers data from authoritative application services:
- **Project Progress:** Queries active `Project` rows, comparing completed tasks to pending milestones.
- **Deadline Risks:** Scans tasks with approaching or passed deadlines (`status != COMPLETED`).
- **Schedule Constraints:** Integrates confirmed standing preferences (e.g. "no meetings before 11:00 AM").
- **Unresolved Past Blockers:** Scans `KnowledgeNote` items tagged with `blocker` or `unresolved`.

## 2. Evidence-Based Confidence Scoring

Every proactive opportunity is tagged with a confidence score (0.0 – 1.0):
- Explicit standing rules: `0.95`
- Database-backed task deadlines: `0.94`
- Milestone completions: `0.90`
- Extracted past blockers: `0.88`
Opportunities with confidence below `0.75` are automatically silenced.

