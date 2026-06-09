package com.gurucrm.mobile.data

import com.russhwolf.settings.Settings
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class TokenStore(private val settings: Settings = Settings()) {
    private val json = Json { ignoreUnknownKeys = true }

    fun getToken(): String? = settings.getStringOrNull(KEY_TOKEN)

    fun getUser(): UserDto? {
        val raw = settings.getStringOrNull(KEY_USER) ?: return null
        return runCatching { json.decodeFromString<UserDto>(raw) }.getOrNull()
    }

    fun saveSession(token: String, user: UserDto) {
        settings.putString(KEY_TOKEN, token)
        settings.putString(KEY_USER, json.encodeToString(user))
    }

    fun clear() {
        settings.remove(KEY_TOKEN)
        settings.remove(KEY_USER)
    }

    companion object {
        private const val KEY_TOKEN = "crm_token"
        private const val KEY_USER = "crm_user"
    }
}
