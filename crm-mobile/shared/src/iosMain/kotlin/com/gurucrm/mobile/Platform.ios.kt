package com.gurucrm.mobile

import platform.Foundation.NSString
import platform.Foundation.stringWithFormat

actual fun apiBaseUrl(): String = "https://guru-crm.onrender.com"

actual fun platformName(): String = "iOS"

actual fun Double.format(decimals: Int): String =
    NSString.stringWithFormat("%.${decimals}f", this)
