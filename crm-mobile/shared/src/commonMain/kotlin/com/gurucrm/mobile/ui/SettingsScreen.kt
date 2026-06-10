package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.isOwner

@Composable
fun SettingsScreen(
    user: UserDto,
    onBack: () -> Unit,
    onBackupRestore: () -> Unit,
) {
    if (!user.isOwner()) {
        GuruScaffold(title = "Settings", onBack = onBack) {
            Text(
                "Only the company owner can access settings.",
                modifier = Modifier.padding(GuruSpacing.screenHorizontal),
            )
        }
        return
    }

    GuruScaffold(title = "Settings", onBack = onBack) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            PageHeader(title = "Company settings", subtitle = "Owner admin tools")
            GuruCard(onClick = onBackupRestore) {
                Text("Backup & Restore", style = MaterialTheme.typography.titleSmall)
                Text(
                    "Download or restore company data (ZIP with CSV files)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = GuruSpacing.xs),
                )
            }
        }
    }
}
