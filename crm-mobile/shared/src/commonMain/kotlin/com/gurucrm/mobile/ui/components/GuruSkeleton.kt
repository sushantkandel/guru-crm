package com.gurucrm.mobile.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.ui.theme.GuruSpacing

/**
 * Shimmer placeholders for content that is still loading.
 *
 * A spinner alone says "something is happening" but not what is coming. These
 * keep the screen's shape so a list reads as "rows are arriving" rather than
 * "there is nothing here" — the ambiguity a bare spinner or an early empty
 * state leaves behind.
 */
@Composable
private fun shimmerBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val shift by transition.animateFloat(
        initialValue = -600f,
        targetValue = 600f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1400),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmer",
    )
    val base = MaterialTheme.colorScheme.surfaceVariant
    return Brush.linearGradient(
        colors = listOf(base.copy(alpha = 0.55f), base.copy(alpha = 0.95f), base.copy(alpha = 0.55f)),
        start = Offset(shift, 0f),
        end = Offset(shift + 400f, 0f),
    )
}

@Composable
fun SkeletonBar(
    widthFraction: Float = 1f,
    height: Dp = 14.dp,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(6.dp))
            .background(shimmerBrush()),
    ) {}
}

/** Placeholder shaped like a list card: title, subtitle, a detail line and an amount. */
@Composable
fun SkeletonCard(lines: Int = 3) {
    GuruCard {
        SkeletonBar(widthFraction = 0.55f, height = 16.dp)
        Column(
            Modifier.padding(top = GuruSpacing.sm),
            verticalArrangement = Arrangement.spacedBy(GuruSpacing.xs),
        ) {
            repeat(lines) { i ->
                SkeletonBar(widthFraction = if (i == lines - 1) 0.35f else 0.8f, height = 12.dp)
            }
        }
    }
}

/** A stack of card placeholders, used while a list loads. */
@Composable
fun SkeletonList(count: Int = 5, lines: Int = 3, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        repeat(count) { SkeletonCard(lines = lines) }
    }
}

/** Placeholder for the dashboard's stat tiles. */
@Composable
fun SkeletonStatGrid(rows: Int = 2) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = GuruSpacing.screenHorizontal),
        verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
    ) {
        repeat(rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(GuruSpacing.sm)) {
                repeat(2) {
                    GuruCard(modifier = Modifier.weight(1f)) {
                        SkeletonBar(widthFraction = 0.6f, height = 12.dp)
                        Column(Modifier.padding(top = GuruSpacing.sm)) {
                            SkeletonBar(widthFraction = 0.45f, height = 20.dp)
                        }
                    }
                }
            }
        }
    }
}
