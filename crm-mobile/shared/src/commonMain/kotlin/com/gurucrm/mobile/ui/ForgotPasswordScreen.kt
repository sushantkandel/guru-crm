package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.theme.GuruSpacing
import kotlinx.coroutines.launch

@Composable
fun ForgotPasswordScreen(api: GuruApi, onBack: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    GuruScaffold(title = "Forgot password", onBack = onBack) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(GuruSpacing.authPadding),
        ) {
            Text(
                "Enter your email and we will send a password reset link.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(GuruSpacing.lg))

            GuruTextField(value = email, onValueChange = { email = it }, label = "Email")

            Spacer(Modifier.height(GuruSpacing.actionGap))

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(GuruSpacing.sm))
            }
            message?.let {
                Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(GuruSpacing.sm))
            }

            GuruPrimaryButton(
                text = if (loading) "Sending…" else "Send reset link",
                enabled = !loading && email.isNotBlank(),
                onClick = {
                    loading = true
                    error = null
                    message = null
                    scope.launch {
                        try {
                            message = api.forgotPassword(email.trim())
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to send reset email"
                        } finally {
                            loading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )

            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Back to sign in")
            }
        }
    }
}
