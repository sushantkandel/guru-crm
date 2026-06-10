package com.gurucrm.mobile.util

import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class GoogleCredentialProfile(
    val email: String = "",
    val ownerName: String = "",
)

private val json = Json { ignoreUnknownKeys = true }

@OptIn(ExperimentalEncodingApi::class)
fun parseGoogleCredential(credential: String): GoogleCredentialProfile {
    val parts = credential.split('.')
    if (parts.size < 2) return GoogleCredentialProfile()

    return runCatching {
        val normalized = parts[1].replace('-', '+').replace('_', '/')
        val padding = (4 - normalized.length % 4) % 4
        val padded = normalized + "=".repeat(padding)
        val payload = Base64.Default.decode(padded).decodeToString()
        val obj = json.parseToJsonElement(payload).jsonObject
        GoogleCredentialProfile(
            email = obj["email"]?.jsonPrimitive?.content.orEmpty(),
            ownerName = obj["name"]?.jsonPrimitive?.content.orEmpty(),
        )
    }.getOrDefault(GoogleCredentialProfile())
}
