package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.GuruPasswordField
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.theme.GuruSpacing
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(api: GuruApi, onLoggedIn: (UserDto) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        Modifier.fillMaxSize().padding(GuruSpacing.authPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(GuruSpacing.xxl))

        Text("Guru CRM", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(GuruSpacing.sm))
        Text("Field sales mobile", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        Spacer(Modifier.height(GuruSpacing.xl))

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(GuruSpacing.fieldGap),
        ) {
            GuruTextField(value = email, onValueChange = { email = it }, label = "Email")
            GuruPasswordField(value = password, onValueChange = { password = it }, label = "Password")

            // Full 24dp between last field and actions (not inside GuruFormColumn).
            Spacer(Modifier.height(GuruSpacing.actionGap))

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }

            GuruPrimaryButton(
                text = if (loading) "Signing in…" else "Sign in",
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        try {
                            val auth = api.login(email.trim(), password)
                            onLoggedIn(auth.user)
                        } catch (e: Exception) {
                            error = e.message ?: "Login failed"
                        } finally {
                            loading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
