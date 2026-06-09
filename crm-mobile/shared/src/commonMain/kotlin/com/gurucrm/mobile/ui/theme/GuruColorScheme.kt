package com.gurucrm.mobile.ui.theme

import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

val GuruBlue = Color(0xFF2563EB)
val GuruBlueDark = Color(0xFF1D4ED8)
val GuruGreen = Color(0xFF16A34A)
val GuruRed = Color(0xFFDC2626)
val GuruBackground = Color(0xFFF8FAFC)
val GuruSurface = Color(0xFFFFFFFF)
val GuruMuted = Color(0xFF64748B)
val GuruBorder = Color(0xFFE2E8F0)
val GuruAmber = Color(0xFFD97706)
val GuruSlate = Color(0xFF64748B)

val GuruLightColorScheme = lightColorScheme(
    primary = GuruBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDBEAFE),
    onPrimaryContainer = GuruBlueDark,
    secondary = GuruGreen,
    onSecondary = Color.White,
    background = GuruBackground,
    onBackground = Color(0xFF0F172A),
    surface = GuruSurface,
    onSurface = Color(0xFF0F172A),
    onSurfaceVariant = GuruMuted,
    error = GuruRed,
    onError = Color.White,
    outline = GuruBorder,
)
