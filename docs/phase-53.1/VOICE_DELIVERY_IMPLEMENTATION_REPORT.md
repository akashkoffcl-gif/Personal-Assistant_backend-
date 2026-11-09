# Voice Delivery Implementation Report

## 1. Client-Side Speech Preprocessing
In [`useVoiceInteraction.ts`](file:///D:/PT/apps/web/src/hooks/useVoiceInteraction.ts):
- Markdown asterisks, backticks, and code blocks are stripped.
- Bullet points (`- `) are converted into distinct sentences (`. `) to ensure proper intonational pauses.
- Multi-line paragraphs are normalized with breath pauses.

## 2. Context-Driven Cadence
The client dynamically reads `intentAnalysis.userPacing` and `urgency` from the API response payload, modulating speech rate between 0.95x and 1.15x.

