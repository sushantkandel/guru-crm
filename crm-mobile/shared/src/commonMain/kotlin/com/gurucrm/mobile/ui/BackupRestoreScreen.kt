package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.BackupPreviewDto
import com.gurucrm.mobile.platform.BackupFileService
import com.gurucrm.mobile.platform.PickedBackupFile
import com.gurucrm.mobile.ui.components.ConfirmDialog
import com.gurucrm.mobile.ui.components.GuruDangerButton
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.theme.GuruSpacing
import kotlinx.coroutines.launch

@Composable
fun BackupRestoreScreen(
    api: GuruApi,
    backupFiles: BackupFileService,
    onBack: () -> Unit,
) {
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var exporting by remember { mutableStateOf(false) }
    var validating by remember { mutableStateOf(false) }
    var safetyExporting by remember { mutableStateOf(false) }
    var restoring by remember { mutableStateOf(false) }
    var preview by remember { mutableStateOf<BackupPreviewDto?>(null) }
    var pickedFile by remember { mutableStateOf<PickedBackupFile?>(null) }
    var safetyDownloaded by remember { mutableStateOf(false) }
    var confirmText by remember { mutableStateOf("") }
    var showRestoreDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    GuruScaffold(title = "Backup & Restore", onBack = onBack) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            PageHeader(
                title = "Company backup",
                subtitle = "ZIP file with CSV data. Restore replaces all business records.",
            )

            message?.let {
                Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal))
            }
            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.sm))
            }

            Column(Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.sm)) {
                GuruPrimaryButton(
                    text = if (exporting) "Preparing…" else "Download backup",
                    enabled = !exporting,
                    onClick = {
                        exporting = true
                        error = null
                        message = null
                        scope.launch {
                            try {
                                val (bytes, name) = api.downloadBackup()
                                if (backupFiles.saveZip(name, bytes)) {
                                    message = "Backup saved: $name"
                                } else {
                                    error = "Could not save file. Check storage permission."
                                }
                            } catch (e: Exception) {
                                error = e.message
                            } finally {
                                exporting = false
                            }
                        }
                    },
                )

                GuruOutlinedButton(
                    text = if (pickedFile != null) "Selected: ${pickedFile!!.name}" else "Choose backup ZIP",
                    onClick = {
                        scope.launch {
                            error = null
                            pickedFile = backupFiles.pickZip()
                            preview = null
                            safetyDownloaded = false
                            confirmText = ""
                        }
                    },
                    modifier = Modifier.padding(top = GuruSpacing.md),
                )

                GuruOutlinedButton(
                    text = if (validating) "Validating…" else "Validate file",
                    enabled = pickedFile != null && !validating,
                    onClick = {
                        val file = pickedFile ?: return@GuruOutlinedButton
                        validating = true
                        error = null
                        scope.launch {
                            try {
                                preview = api.validateBackup(file.name, file.bytes)
                                message = "Backup is valid. Download safety backup before restore."
                            } catch (e: Exception) {
                                preview = null
                                error = e.message
                            } finally {
                                validating = false
                            }
                        }
                    },
                    modifier = Modifier.padding(top = GuruSpacing.sm),
                )

                if (preview != null) {
                    val p = preview!!
                    Text(
                        "Company: ${p.manifest.companyName}\n" +
                            "Exported: ${p.manifest.exportedAt}\n" +
                            "Customers: ${p.counts["customers"] ?: 0} · Orders: ${p.counts["orders"] ?: 0} · " +
                            "Payments: ${p.counts["payments"] ?: 0}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(vertical = GuruSpacing.md),
                    )

                    GuruOutlinedButton(
                        text = if (safetyExporting) "Downloading…" else "Download safety backup",
                        enabled = !safetyExporting,
                        onClick = {
                            safetyExporting = true
                            scope.launch {
                                try {
                                    val (bytes, name) = api.downloadPreRestoreBackup()
                                    if (backupFiles.saveZip(name, bytes)) {
                                        safetyDownloaded = true
                                        message = "Safety backup saved"
                                    } else {
                                        error = "Could not save safety backup"
                                    }
                                } catch (e: Exception) {
                                    error = e.message
                                } finally {
                                    safetyExporting = false
                                }
                            }
                        },
                    )
                }

                if (preview != null && safetyDownloaded) {
                    GuruTextField(
                        value = confirmText,
                        onValueChange = { confirmText = it },
                        label = "Type RESTORE to confirm",
                        modifier = Modifier.padding(top = GuruSpacing.md),
                    )
                    GuruDangerButton(
                        text = "Restore backup",
                        enabled = confirmText == "RESTORE" && !restoring,
                        onClick = { showRestoreDialog = true },
                        modifier = Modifier.padding(top = GuruSpacing.sm),
                    )
                }
            }
        }
    }

    if (showRestoreDialog) {
        ConfirmDialog(
            title = "Restore backup?",
            message = "This replaces all customers, orders, payments, and products. Continue?",
            confirmLabel = if (restoring) "Restoring…" else "Restore now",
            loading = restoring,
            onConfirm = {
                val file = pickedFile ?: return@ConfirmDialog
                restoring = true
                scope.launch {
                    try {
                        val result = api.restoreBackup(file.name, file.bytes)
                        message = "Restored ${result.counts.customers} customers, ${result.counts.orders} orders"
                        preview = null
                        pickedFile = null
                        safetyDownloaded = false
                        confirmText = ""
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        restoring = false
                        showRestoreDialog = false
                    }
                }
            },
            onDismiss = { showRestoreDialog = false },
        )
    }
}
