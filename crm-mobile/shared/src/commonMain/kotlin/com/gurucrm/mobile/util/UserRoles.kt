package com.gurucrm.mobile.util

import com.gurucrm.mobile.data.UserDto

fun UserDto.canEdit(): Boolean = role in setOf("owner", "staff")
fun UserDto.canDelete(): Boolean = role == "owner"
fun UserDto.canRequestDelete(): Boolean = role == "staff"
fun UserDto.isOwner(): Boolean = role == "owner"
fun UserDto.isViewer(): Boolean = role == "viewer"

/** Product catalog management — owner and staff only (viewers cannot see Products on mobile). */
fun UserDto.canManageProducts(): Boolean = canEdit()
