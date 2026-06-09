package com.gurucrm.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import com.gurucrm.mobile.ui.theme.GuruLightColorScheme
import com.gurucrm.mobile.ui.theme.GuruShapes
import com.gurucrm.mobile.ui.theme.GuruTypography

@Composable
fun GuruTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = GuruLightColorScheme,
        typography = GuruTypography,
        shapes = GuruShapes,
        content = content,
    )
}
