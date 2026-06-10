package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.api.AuthException
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.AuthErrorCodes
import com.gurucrm.mobile.data.RegisterDraft
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.data.needsRegisterRedirect
import com.gurucrm.mobile.platform.GoogleSignIn
import com.gurucrm.mobile.ui.components.AppLogo
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPasswordField
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.parseGoogleCredential
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    api: GuruApi,
    onLoggedIn: (UserDto) -> Unit,
    onForgotPassword: () -> Unit,
    onRegister: (RegisterDraft?) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var googleLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val googleSignInAvailable = remember { GoogleSignIn.isAvailable() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .navigationBarsPadding()
            .padding(GuruSpacing.authPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(GuruSpacing.lg))

            AppLogo(size = 220.dp)
            Spacer(Modifier.height(GuruSpacing.md))

            Text(
                "Field sales mobile",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(GuruSpacing.xl))

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(GuruSpacing.fieldGap),
            ) {
                if (googleSignInAvailable) {
                    GuruOutlinedButton(
                        text = if (googleLoading) "Signing in with Google…" else "Sign in with Google",
                        enabled = !loading && !googleLoading,
                        onClick = {
                            googleLoading = true
                            error = null
                            scope.launch {
                                try {
                                    val token = GoogleSignIn.signIn().getOrThrow()
                                    try {
                                        val auth = api.loginWithGoogle(token)
                                        onLoggedIn(auth.user)
                                    } catch (e: AuthException) {
                                        if (e.code == AuthErrorCodes.NO_COMPANY) {
                                            val profile = parseGoogleCredential(token)
                                            onRegister(
                                                RegisterDraft(
                                                    email = profile.email,
                                                    ownerName = profile.ownerName,
                                                    fromAuth = true,
                                                ),
                                            )
                                        } else {
                                            error = e.message ?: "Google sign-in failed"
                                        }
                                    }
                                } catch (e: Exception) {
                                    val message = e.message.orEmpty()
                                    if (!message.contains("cancelled", ignoreCase = true)) {
                                        error = message.ifBlank { "Google sign-in failed" }
                                    }
                                } finally {
                                    googleLoading = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    RowDividerLabel()
                }

                GuruTextField(value = email, onValueChange = { email = it }, label = "Email")
                GuruPasswordField(value = password, onValueChange = { password = it }, label = "Password")

                Spacer(Modifier.height(GuruSpacing.actionGap))

                error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }

                GuruPrimaryButton(
                    text = if (loading) "Signing in…" else "Sign in",
                    enabled = !loading && !googleLoading && email.isNotBlank() && password.isNotBlank(),
                    onClick = {
                        loading = true
                        error = null
                        scope.launch {
                            try {
                                val auth = api.login(email.trim(), password)
                                onLoggedIn(auth.user)
                            } catch (e: AuthException) {
                                if (needsRegisterRedirect(e.code)) {
                                    onRegister(
                                        RegisterDraft(
                                            email = email.trim(),
                                            fromAuth = true,
                                        ),
                                    )
                                } else {
                                    error = e.message ?: "Login failed"
                                }
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

        LoginAuthFooter(
            onForgotPassword = onForgotPassword,
            onRegister = { onRegister(null) },
        )
    }
}

@Composable
private fun LoginAuthFooter(
    onForgotPassword: () -> Unit,
    onRegister: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = GuruSpacing.lg, bottom = GuruSpacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        TextButton(
            onClick = onForgotPassword,
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(vertical = GuruSpacing.sm),
        ) {
            Text("Forgot password?")
        }

        Spacer(Modifier.height(GuruSpacing.md))

        TextButton(
            onClick = onRegister,
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(vertical = GuruSpacing.sm),
        ) {
            Text("Register")
        }
    }
}

@Composable
private fun RowDividerLabel() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = GuruSpacing.sm),
        contentAlignment = Alignment.Center,
    ) {
        HorizontalDivider()
        Surface(
            color = MaterialTheme.colorScheme.background,
            modifier = Modifier.padding(horizontal = GuruSpacing.sm),
        ) {
            Text(
                text = "Or continue with email",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = GuruSpacing.xs),
            )
        }
    }
}
