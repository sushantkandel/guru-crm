package com.gurucrm.mobile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.data.CustomerTypes
import com.gurucrm.mobile.ui.theme.GuruSpacing

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CustomerTypeChips(
    selected: List<String>,
    onChange: (List<String>) -> Unit,
    modifier: Modifier = Modifier,
) {
    Text(
        "Customer type",
        style = MaterialTheme.typography.labelLarge,
        modifier = Modifier.padding(bottom = GuruSpacing.xs),
    )
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
        verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
    ) {
        CustomerTypes.all.forEach { type ->
            FilterChip(
                selected = type in selected,
                onClick = {
                    onChange(
                        if (type in selected) selected - type else selected + type,
                    )
                },
                label = { Text(CustomerTypes.label(type)) },
            )
        }
    }
}
