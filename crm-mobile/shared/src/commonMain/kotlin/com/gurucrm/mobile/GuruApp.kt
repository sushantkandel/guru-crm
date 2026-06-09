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
import com.gurucrm.mobile.ui.GuruTheme
import com.gurucrm.mobile.ui.LoginScreen
import com.gurucrm.mobile.ui.MainShell

@Composable
fun GuruApp() {
    val tokenStore = remember { TokenStore() }
    val api = remember { GuruApi(tokenStore) }
    val platform = remember { createPlatformServices() }
    var user by remember { mutableStateOf<UserDto?>(null) }
    var bootstrapping by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        user = api.restoreSession()
        bootstrapping = false
    }

    GuruTheme {
        when {
            bootstrapping -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            user == null -> {
                LoginScreen(api = api, onLoggedIn = { user = it })
            }
            else -> {
                MainShell(
                    api = api,
                    platform = platform,
                    user = user!!,
                    onLogout = { user = null },
                )
            }
        }
    }
}
