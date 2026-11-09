# Known Issues & Limitations

1. **Browser SpeechSynthesis Expressiveness:**
   - The Web Speech API does not support fine-grained SSML pitch curves or emotional inflections.
   - Mitigated via custom client-side sentence segmentation, breath pauses, and context-dependent playback rates (0.95x - 1.15x).

2. **Mixed Language / Accent Limitations:**
   - Chrome's Web Speech API recognition accuracy drops when switching between English and Tamil within a single sentence unless the browser language profile explicitly matches.
   - Pure English and well-enunciated mixed keywords resolve correctly.

3. **Cloud Latency Variance:**
   - Gemini API network roundtrips over WAN can vary between 2.2s and 4.5s depending on payload token length.

