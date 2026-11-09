# Personal Context Engine

## 1. Relevance-Driven Context Assembly
Rather than dumping entire database tables into LLM prompts, the context engine dynamically filters data based on intent:
- **Executive Briefing:** Pulls today's scheduled tasks, active goals, overdue warnings, and focus targets.
- **Focus Studio:** Focus preferences, active session state, and remaining daily minutes.
- **Knowledge Synthesis:** Searches user's knowledge notes using keyword and semantic term matching.
- **Finance Inquiries:** Balances and monthly category breakdown.

## 2. Privacy & User Data Isolation
- All database queries enforce strict `where: { userId }` parameterization.
- No user context is shared across multi-tenant sessions.
- Inactive or deleted documents are excluded from context retrieval.

