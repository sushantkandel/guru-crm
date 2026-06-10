package com.gurucrm.mobile.platform

actual object GoogleSignIn {
    actual fun isAvailable(): Boolean = false

    actual suspend fun signIn(): Result<String> =
        Result.failure(IllegalStateException("Google sign-in is not available on iOS yet"))
}
