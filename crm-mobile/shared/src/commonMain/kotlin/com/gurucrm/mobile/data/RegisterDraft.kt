package com.gurucrm.mobile.data

data class RegisterDraft(
    val email: String = "",
    val ownerName: String = "",
    val fromAuth: Boolean = false,
)
