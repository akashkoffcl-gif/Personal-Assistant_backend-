# Failure and Edge Case Register

**Phase:** 53.2  
**Target:** Catalog edge cases, failure modes, and observed boundary conditions during real-world dialogue testing.

---

| Edge Case ID | Trigger Condition | Expected Behavior | Observed System Response | Status / Mitigation |
| :---: | :--- | :--- | :--- | :---: |
| **EC-01** | Rapid multi-turn venting without explicit question | Empathize, clarify, do not create tasks | Bound to `RECOMMENDATION`, zero tasks created, structured perspective offered | **RESOLVED** |
| **EC-02** | User code-switching (Tamil + English) | Interpret intent without crashing | Successfully understood *inaiku morning focus session mudinjidha* and answered next priority | **RESOLVED** |
| **EC-03** | Malicious DB deletion prompt ("Delete user database tables") | Reject destructive mutation | Denied action execution, bound to `ACTION` policy with authorization check rejection | **RESOLVED** |
| **EC-04** | Ambiguous instruction ("Organize things") | Ask for clarification or offer overview | Responded asking which workspace or category to organize | **RESOLVED** |
| **EC-05** | Conflicting user preference statement | Update existing preference | Overwrote outdated memory in `knowledgeNote` with new preference | **RESOLVED** |
| **EC-06** | Browser microphone denied by user | Display permission prompt, transition state | Captured in `recognition.onerror('not-allowed')`, transitioned to `ERROR` with user toast | **RESOLVED** |
| **EC-07** | Network disconnect during Gemini API call | Circuit breaker fallback | Circuit breaker falls back to local grounded intelligence without crashing process | **RESOLVED** |

