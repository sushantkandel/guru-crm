package com.gurucrm.mobile.platform

actual fun createBackupFileService(): BackupFileService = IosBackupFileService()

/** iOS file picker/save requires native bridge — export via web Settings until wired. */
class IosBackupFileService : BackupFileService {
    override suspend fun saveZip(fileName: String, bytes: ByteArray): Boolean = false

    override suspend fun pickZip(): PickedBackupFile? = null
}
