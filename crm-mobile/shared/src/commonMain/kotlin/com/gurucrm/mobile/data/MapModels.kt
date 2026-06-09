package com.gurucrm.mobile.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class ShopDto(
    val customerId: String,
    val name: String,
    val shopName: String,
    val phone: String,
    val province: String,
    val district: String,
    val municipality: String,
    val ward: String,
    val street: String? = null,
    val latitude: Double,
    val longitude: Double,
)

@Serializable
data class MapLocationQuery(
    val province: String? = null,
    val district: String? = null,
    val municipality: String? = null,
    val ward: String? = null,
)

@Serializable
data class RouteResponseDto(
    val distanceMeters: Double,
    val durationSeconds: Double,
    val geometry: JsonElement,
)

data class LatLng(val lat: Double, val lng: Double)

@Serializable
data class MapMarker(
    val id: String,
    val lat: Double,
    val lng: Double,
    val title: String,
    val subtitle: String = "",
    val isSelected: Boolean = false,
)
