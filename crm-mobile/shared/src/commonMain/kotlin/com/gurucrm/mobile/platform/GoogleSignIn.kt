package com.gurucrm.mobile.platform

expect object GoogleSignIn {
    fun isAvailable(): Boolean
    suspend fun signIn(): Result<String>
}
