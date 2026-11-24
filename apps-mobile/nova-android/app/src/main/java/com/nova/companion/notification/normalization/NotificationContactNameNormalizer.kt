package com.nova.companion.notification.normalization

import java.text.Normalizer
import java.util.regex.Pattern

/**
 * NotificationContactNameNormalizer
 *
 * Normalizes contact names for natural spoken Text-To-Speech delivery.
 * Strips decorative emojis, symbols, and formatting artifacts while preserving:
 * - Proper Unicode names (Latin, Devanagari, Tamil, Telugu, Malayalam, Bengali, etc.)
 * - Legitimate name punctuation (hyphens, apostrophes, periods, single spaces)
 * - Safe fallback ("Someone") when a contact name consists purely of emojis/symbols.
 */
object NotificationContactNameNormalizer {

    // Regex pattern for Unicode Emoji, Pictographs, Emoticons, Symbols, and Variation Selectors
    // \p{So}: Other Symbol (emojis, pictographs)
    // \p{Cn}: Unassigned (future emojis/variation selectors)
    // \p{Sk}: Modifier Symbol
    // \p{M}: Combining Mark (excluding standard language diacritics where applicable)
    // Specific emoji ranges: U+1F300-1F64F, U+1F680-1F6FF, U+2600-27BF, U+1F900-1F9FF, etc.
    // Android's java.util.regex (backed by ICU) does not support Pattern.UNICODE_CHARACTER_CLASS.
    // We use character code-point filtering and standard regex for emoji removal.
    private val EMOJI_AND_DECORATIVE_PATTERN = Pattern.compile(
        "[\\p{So}\\p{Cs}\\x{1F000}-\\x{1FAFF}\\x{2600}-\\x{27BF}\\x{2300}-\\x{23FF}\\x{2B50}\\x{200D}\\x{FE0E}\\x{FE0F}]+"
    )

    // Unwanted leading/trailing non-word characters (e.g. decorative dashes, stars, tildes)
    private val DECORATIVE_DELIMITERS = Pattern.compile("^[\\s~*•|#@!^&()_=+<>\\[\\]{}]+|[\\s~*•|#@!^&()_=+<>\\[\\]{}]+$")
    private val MULTI_SPACE_PATTERN = Pattern.compile("\\s+")

    /**
     * Normalizes a raw sender/contact name for speech output.
     *
     * @param rawName The raw contact string (e.g. "🔥 Harish ❤️", "👑 Rahul", "❤️ Priya 🌸")
     * @return Natural clean spoken name (e.g. "Harish", "Rahul", "Priya")
     */
    fun normalizeForSpeech(rawName: String?): String {
        if (rawName.isNullOrBlank()) {
            return "Someone"
        }

        var cleaned = rawName

        // 1. Remove emojis and decorative pictographs
        cleaned = EMOJI_AND_DECORATIVE_PATTERN.matcher(cleaned).replaceAll(" ")

        // 2. Remove decorative prefix/suffix punctuation
        cleaned = DECORATIVE_DELIMITERS.matcher(cleaned).replaceAll(" ")

        // 3. Normalize whitespace
        cleaned = MULTI_SPACE_PATTERN.matcher(cleaned).replaceAll(" ").trim()

        // 4. If name contained only emojis/symbols and is now empty, provide safe natural fallback
        if (cleaned.isBlank()) {
            return "Someone"
        }

        // 5. Clean up any orphaned trailing/leading punctuation
        cleaned = cleaned.trim(',', '.', '-', '\'', '’', ' ')
        if (cleaned.isBlank()) {
            return "Someone"
        }

        return cleaned
    }
}
