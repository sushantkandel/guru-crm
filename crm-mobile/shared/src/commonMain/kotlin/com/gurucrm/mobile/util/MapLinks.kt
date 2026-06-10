package com.gurucrm.mobile.util

import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.format

private val nepalLat = 26.0..31.0
private val nepalLng = 80.0..89.0

fun resolveShopCoords(latitude: Double?, longitude: Double?): LatLng? {
    var lat = latitude ?: return null
    var lng = longitude ?: return null
    if (lat == 0.0 && lng == 0.0) return null
    if (lat in nepalLng && lng in nepalLat) {
        val tmp = lat
        lat = lng
        lng = tmp
    }
    if (lat !in nepalLat || lng !in nepalLng) return null
    return LatLng(lat, lng)
}

private fun formatCoord(value: Double): String = value.format(7)

private fun encodeMapLabel(label: String): String =
    encodeURIComponent(label.trim()).replace("%20", "+")

private fun encodeURIComponent(value: String): String =
    value.encodeToByteArray().joinToString("") { byte ->
        val c = byte.toInt() and 0xFF
        when {
            c in 'a'.code..'z'.code || c in 'A'.code..'Z'.code || c in '0'.code..'9'.code ||
                c == '-'.code || c == '_'.code || c == '.'.code || c == '~'.code -> c.toChar().toString()
            c == ' '.code -> "+"
            else -> "%%${c.toString(16).uppercase().padStart(2, '0')}"
        }
    }

private fun coordsWithLabel(lat: Double, lng: Double, label: String): String {
    val name = encodeMapLabel(label)
    return "${formatCoord(lat)},${formatCoord(lng)}+($name)"
}

fun googleMapsDirectionsUrl(
    destLat: Double,
    destLng: Double,
    shopName: String,
    origin: LatLng? = null,
): String {
    val daddr = coordsWithLabel(destLat, destLng, shopName)
    if (origin != null) {
        val saddr = "${formatCoord(origin.lat)},${formatCoord(origin.lng)}"
        return "https://www.google.com/maps?saddr=$saddr&daddr=$daddr&dir_action=navigate"
    }
    return "https://www.google.com/maps?daddr=$daddr&dir_action=navigate"
}

fun formatRouteDistance(meters: Double): String {
    if (meters < 1000) return "${meters.toInt()} m"
    return "${(meters / 1000).format(1)} km"
}

fun formatRouteDuration(seconds: Double): String {
    val mins = (seconds / 60).toInt()
    if (mins < 60) return "$mins min"
    val hours = mins / 60
    val rem = mins % 60
    return if (rem == 0) "${hours}h" else "${hours}h ${rem}m"
}
