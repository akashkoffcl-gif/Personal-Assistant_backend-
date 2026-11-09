# Context Relevance and Confidence Model

**Phase:** 53.3  
**Target:** Algorithmic formulation of relevance scoring and recency decay.

---

## 1. Mathematical Formulation

$$Score = C_{base} \times R_{recency} \times V_{verification}$$

Where:
- $C_{base}$: Base confidence (0.85 for inferred patterns, 0.95 for user-explicit records).
- $R_{recency}$: Time-decay factor computed over elapsed days since last confirmation:
  $$R_{recency} = e^{-\lambda \Delta t}$$
- $V_{verification}$: Verification multiplier (1.0 if verified in DB, 0.6 if unconfirmed).

## 2. Threshold Gating

- **$Score \ge 0.85$:** Eligible for proactive notification/suggestion.
- **$0.70 \le Score < 0.85$:** Contextual inquiry (`ASK` for confirmation).
- **$Score < 0.70$:** Suppressed to `SILENCE`.

