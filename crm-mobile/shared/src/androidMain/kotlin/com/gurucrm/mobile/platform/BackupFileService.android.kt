package com.gurucrm.mobile.platform

import android.content.ContentValues
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.result.contract.ActivityResultContracts
import com.gurucrm.mobile.platform.AndroidAppContext.activity
import com.gurucrm.mobile.platform.AndroidAppContext.context
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object BackupFileBridge {
    private var pickContinuation: ((PickedBackupFile?) -> Unit)? = null
    private var saveContinuation: ((Boolean) -> Unit)? = null
  private var saveBytes: ByteArray? = null

    fun registerPickLauncher(activity: androidx.activity.ComponentActivity) {
        val launcher = activity.registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val cont = pickContinuation
            pickContinuation = null
            if (cont == null) return@registerForActivityResult
            if (uri == null) {
                cont(null)
                return@registerForActivityResult
            }
            try {
                context.contentResolver.openInputStream(uri)?.use { input ->
                    val bytes = input.readBytes()
                    val name = uri.lastPathSegment?.substringAfterLast('/') ?: "backup.zip"
                    cont(PickedBackupFile(name, bytes))
                } ?: cont(null)
            } catch (_: Exception) {
                cont(null)
            }
        }
        pickLauncher = launcher
    }

    fun registerSaveLauncher(activity: androidx.activity.ComponentActivity) {
        val launcher = activity.registerForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
            val cont = saveContinuation
            val bytes = saveBytes
            saveContinuation = null
            saveBytes = null
            if (uri == null || cont == null || bytes == null) {
                cont?.invoke(false)
                return@registerForActivityResult
            }
            try {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                cont(true)
            } catch (_: Exception) {
                cont(false)
            }
        }
        saveLauncher = launcher
    }

    private var pickLauncher: androidx.activity.result.ActivityResultLauncher<Array<String>>? = null
    private var saveLauncher: androidx.activity.result.ActivityResultLauncher<String>? = null

    suspend fun launchPick(): PickedBackupFile? = suspendCancellableCoroutine { cont ->
        val launcher = pickLauncher
        if (launcher == null) {
            cont.resume(null)
            return@suspendCancellableCoroutine
        }
        pickContinuation = { cont.resume(it) }
        launcher.launch(arrayOf("application/zip", "application/x-zip-compressed"))
    }

    suspend fun launchSave(fileName: String, bytes: ByteArray): Boolean = suspendCancellableCoroutine { cont ->
        val launcher = saveLauncher
        if (launcher == null) {
            cont.resume(fallbackSaveToDownloads(fileName, bytes))
            return@suspendCancellableCoroutine
        }
        saveContinuation = { cont.resume(it) }
        saveBytes = bytes
        launcher.launch(fileName)
    }

    private fun fallbackSaveToDownloads(fileName: String, bytes: ByteArray): Boolean {
        return try {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, "application/zip")
                put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/")
            }
            val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: return false
            context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return false
            true
        } catch (_: Exception) {
            false
        }
    }
}

actual fun createBackupFileService(): BackupFileService = AndroidBackupFileService()

class AndroidBackupFileService : BackupFileService {
    override suspend fun saveZip(fileName: String, bytes: ByteArray): Boolean {
        return BackupFileBridge.launchSave(fileName, bytes)
    }

    override suspend fun pickZip(): PickedBackupFile? {
        return BackupFileBridge.launchPick()
    }
}
