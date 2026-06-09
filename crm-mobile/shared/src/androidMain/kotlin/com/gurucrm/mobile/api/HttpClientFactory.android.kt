package com.gurucrm.mobile.api

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.okhttp.OkHttp
import okhttp3.OkHttpClient

actual fun createPlatformHttpClient(configure: HttpClientConfig<*>.() -> Unit): HttpClient =
    HttpClient(OkHttp) {
        engine {
            preconfigured = OkHttpClient.Builder()
                .retryOnConnectionFailure(true)
                .build()
        }
        configure()
    }
