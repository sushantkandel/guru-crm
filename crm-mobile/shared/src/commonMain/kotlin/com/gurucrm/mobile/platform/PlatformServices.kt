package com.gurucrm.mobile.platform

import com.gurucrm.mobile.data.LatLng

interface PlatformServices {
    fun openUrl(url: String)
    fun hasLocationPermission(): Boolean
    fun requestLocationPermission()
    suspend fun getCurrentLocation(): LatLng?
}

/** Request permission if needed, then read the current device coordinates. */
suspend fun PlatformServices.refreshDeviceLocation(): LatLng? {
    if (!hasLocationPermission()) requestLocationPermission()
    return getCurrentLocation()
}

expect fun createPlatformServices(): PlatformServices
