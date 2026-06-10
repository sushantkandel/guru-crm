package com.gurucrm.mobile.data

object AuthErrorCodes {
    const val NO_ACCOUNT = "NO_ACCOUNT"
    const val NO_COMPANY = "NO_COMPANY"
}

fun needsRegisterRedirect(code: String?): Boolean =
    code == AuthErrorCodes.NO_ACCOUNT || code == AuthErrorCodes.NO_COMPANY
