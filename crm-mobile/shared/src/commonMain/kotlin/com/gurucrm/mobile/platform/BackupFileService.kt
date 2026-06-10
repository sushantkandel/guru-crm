package com.gurucrm.mobile.platform

data class PickedBackupFile(
    val name: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as PickedBackupFile
        return name == other.name && bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = name.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

interface BackupFileService {
    suspend fun saveZip(fileName: String, bytes: ByteArray): Boolean
    suspend fun pickZip(): PickedBackupFile?
}

expect fun createBackupFileService(): BackupFileService
