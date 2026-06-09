package com.gurucrm.mobile

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.TokenStore
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.platform.createPlatformServices
import com.gurucrm.mobile.ui.ForgotPasswordScreen
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
                    CircularProgressIndicator()
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
