package com.nova.companion.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

val DarkPurpleBg = Color(0xFF0F0A1C)
val CardSurface = Color(0xFF1E1736)
val PurplePrimary = Color(0xFF8B5CF6)
val PurpleAccent = Color(0xFFA78BFA)
val TextPrimary = Color(0xFFF3F4F6)
val TextMuted = Color(0xFF9CA3AF)

val NovaDarkColorScheme = darkColorScheme(
    primary = PurplePrimary,
    secondary = PurpleAccent,
    background = DarkPurpleBg,
    surface = CardSurface,
    onPrimary = Color.White,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

