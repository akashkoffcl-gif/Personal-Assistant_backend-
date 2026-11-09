# Behavioural Context Engine Design

## 1. Evidence-Based Profiling
The `BehaviouralContextService` compiles an evidence-based profile of how the user works:
- **Pacing Preference:** Automatically senses whether the user prefers `CONCISE`, `BALANCED`, or `DETAILED` communication.
- **Interaction Momentum:** Tracks total interaction volume, frequently accessed tools, and active working hours.
- **Correction Tracking:** Logs when the user corrects previous assistant assumptions, preventing repetitive errors.

## 2. Safety Restrictions & Prohibitions
- Never infers medical, psychological, or clinical conditions.
- Never labels users with speculative personality classifications.
- Never converts temporary stress statements into permanent preference records without explicit confirmation.

