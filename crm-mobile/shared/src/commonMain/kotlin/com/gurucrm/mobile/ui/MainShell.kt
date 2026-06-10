package com.gurucrm.mobile.ui

import androidx.compose.runtime.Composable
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.platform.BackupFileService
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.ui.navigation.AppNavHost

@Composable
fun MainShell(
    api: GuruApi,
    platform: PlatformServices,
    backupFiles: BackupFileService,
    user: UserDto,
    onLogout: () -> Unit,
) {
    AppNavHost(
        api = api,
        platform = platform,
        backupFiles = backupFiles,
        user = user,
        onLogout = onLogout,
    )
}
