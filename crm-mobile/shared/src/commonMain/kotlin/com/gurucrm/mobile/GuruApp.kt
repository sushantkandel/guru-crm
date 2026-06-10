package com.gurucrm.mobile

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.TokenStore
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.platform.createBackupFileService
import com.gurucrm.mobile.platform.createPlatformServices
import com.gurucrm.mobile.ui.components.AppLogo
import com.gurucrm.mobile.ui.ForgotPasswordScreen
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.APP_NAME
import com.gurucrm.mobile.ui.GuruTheme
import com.gurucrm.mobile.ui.LoginScreen
import com.gurucrm.mobile.ui.MainShell
import com.gurucrm.mobile.ui.RegisterCompanyScreen
import kotlinx.coroutines.launch

private enum class AuthScreen {
    Login,
    ForgotPassword,
    RegisterCompany,
}

@Composable
fun GuruApp() {
    val tokenStore = remember { TokenStore() }
    val api = remember { GuruApi(tokenStore) }
    val platform = remember { createPlatformServices() }
    val backupFiles = remember { createBackupFileService() }
    var user by remember { mutableStateOf<UserDto?>(null) }
    var bootstrapping by remember { mutableStateOf(true) }
    var authScreen by remember { mutableStateOf(AuthScreen.Login) }

    LaunchedEffect(Unit) {
        val token = tokenStore.getToken()
        if (token == null) {
            bootstrapping = false
            return@LaunchedEffect
        }

        val cachedUser = tokenStore.getUser()
        if (cachedUser != null) {
            user = cachedUser
            bootstrapping = false
            launch {
                val refreshed = api.restoreSessionWithTimeout()
                user = refreshed
            }
        } else {
            user = api.restoreSessionWithTimeout()
            bootstrapping = false
        }
    }

    GuruTheme {
        when {
            bootstrapping -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        AppLogo(size = 160.dp)
                        Spacer(Modifier.height(GuruSpacing.lg))
                        Text(APP_NAME, style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(GuruSpacing.md))
                        CircularProgressIndicator()
                    }
                }
            }
            user == null -> {
                when (authScreen) {
                    AuthScreen.Login -> LoginScreen(
                        api = api,
                        onLoggedIn = { user = it },
                        onForgotPassword = { authScreen = AuthScreen.ForgotPassword },
                        onRegisterCompany = { authScreen = AuthScreen.RegisterCompany },
                    )
                    AuthScreen.ForgotPassword -> ForgotPasswordScreen(
                        api = api,
                        onBack = { authScreen = AuthScreen.Login },
                    )
                    AuthScreen.RegisterCompany -> RegisterCompanyScreen(
                        api = api,
                        onBack = { authScreen = AuthScreen.Login },
                        onRegistered = {
                            user = it
                            authScreen = AuthScreen.Login
                        },
                    )
                }
            }
            else -> {
                MainShell(
                    api = api,
                    platform = platform,
                    backupFiles = backupFiles,
                    user = user!!,
                    onLogout = {
                        api.logout()
                        user = null
                        authScreen = AuthScreen.Login
                    },
                )
            }
        }
    }
}
