package com.gurucrm.mobile.platform

import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.gurucrm.mobile.googleWebClientId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

actual object GoogleSignIn {
    actual fun isAvailable(): Boolean = googleWebClientId().isNotBlank()

    actual suspend fun signIn(): Result<String> = withContext(Dispatchers.Main) {
        val activity = AndroidAppContext.activity
            ?: return@withContext Result.failure(IllegalStateException("Activity not available"))
        val clientId = googleWebClientId()
        if (clientId.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Google sign-in is not configured"))
        }

        try {
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(clientId)
                .setAutoSelectEnabled(false)
                .build()
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()
            val credentialManager = CredentialManager.create(activity)
            val result = credentialManager.getCredential(activity, request)
            val credential = result.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                if (idToken.isNullOrBlank()) {
                    Result.failure(IllegalStateException("Google did not return a sign-in token"))
                } else {
                    Result.success(idToken)
                }
            } else {
                Result.failure(IllegalStateException("Unexpected Google sign-in response"))
            }
        } catch (_: GetCredentialCancellationException) {
            Result.failure(IllegalStateException("Google sign-in was cancelled"))
        } catch (e: Exception) {
            Result.failure(
                IllegalStateException(
                    e.message?.takeIf { it.isNotBlank() } ?: "Google sign-in failed",
                ),
            )
        }
    }
}
