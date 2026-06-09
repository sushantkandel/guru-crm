package com.gurucrm.mobile

import com.gurucrm.mobile.shared.BuildConfig

actual fun apiBaseUrl(): String = BuildConfig.API_BASE_URL

actual fun platformName(): String = "Android"
