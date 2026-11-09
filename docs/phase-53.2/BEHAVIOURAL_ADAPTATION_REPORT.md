# Behavioural Adaptation Report

**Phase:** 53.2  
**Target:** Verify adaptation to user pace, urgency, and communication style based on observable signals.

---

## 1. Adaptation to User Pacing

The system classifies user pacing into four profiles:
- `IN_A_HURRY`: Triggered by terms like "quickly", "asap", "fast", "briefly". System instructions constrain response to 1–2 crisp sentences with zero pleasantries; speech playback rate set to `1.15x`.
- `REFLECTIVE`: Triggered by "help me think", "reflect", "in depth". Tone adjusted to exploratory and measured; speech rate set to `0.95x`.
- `MEASURED`: Standard structured cadence.
- `NORMAL`: Default conversational tone.

## 2. Adaptation to Emotional State

- **Frustrated:** Directives require acknowledging difficulty calmly without patronizing, focusing on immediate unblockers.
- **Overwhelmed:** Directives instruct breaking down the problem into single next steps rather than overwhelming with full plans.
- **Excited:** Directives permit celebratory validation before transitioning to next tasks.

## 3. Strict Boundary Prohibitions

- No clinical or psychiatric diagnoses.
- No permanent personality labels stored.
- Temporary mood swings are never converted to permanent preference records without explicit confirmation.

