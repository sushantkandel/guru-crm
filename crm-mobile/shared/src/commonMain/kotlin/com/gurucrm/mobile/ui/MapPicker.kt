package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapMarker
import com.gurucrm.mobile.platform.OsmMapView
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.platform.refreshDeviceLocation
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.MapLocationFab
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.resolveShopCoords
import kotlinx.coroutines.launch

private val defaultCenter = LatLng(27.7172, 85.324)

@Composable
fun MapPicker(
    latitude: Double?,
    longitude: Double?,
    shopLabel: String,
    addressText: String,
    api: GuruApi,
    platform: PlatformServices,
    onLocationChange: (lat: Double?, lng: Double?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var shopPin by remember(latitude, longitude) { mutableStateOf(resolveShopCoords(latitude, longitude)) }
    var deviceLocation by remember { mutableStateOf<LatLng?>(null) }
    var viewCenter by remember { mutableStateOf<LatLng?>(null) }
    var recenterNonce by remember { mutableStateOf(0) }
    var locating by remember { mutableStateOf(false) }
    var gpsInfo by remember { mutableStateOf("Tap the map to place the red shop pin.") }
    var gpsError by remember { mutableStateOf<String?>(null) }
    var geocoding by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun refreshGps(centerMap: Boolean) {
        locating = true
        val pos = platform.refreshDeviceLocation()
        deviceLocation = pos
        if (pos != null) {
            gpsError = null
            gpsInfo = "Blue dot = you. Tap the map to place the red shop pin."
            if (centerMap) {
                viewCenter = pos
                recenterNonce++
            }
        } else {
            gpsError = "Allow location access to use GPS."
        }
        locating = false
    }

    LaunchedEffect(Unit) {
        refreshGps(centerMap = shopPin == null)
    }

    val markers = shopPin?.let { pin ->
        listOf(MapMarker("shop-pin", pin.lat, pin.lng, shopLabel.ifBlank { "Shop" }, ""))
    } ?: emptyList()

    val mapCenter = viewCenter ?: shopPin ?: deviceLocation ?: defaultCenter

    Column(modifier, verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm)) {
        GuruButtonRow {
            GuruOutlinedButton(
                text = if (locating) "Getting GPS…" else "Refresh GPS",
                enabled = !locating,
                onClick = { scope.launch { refreshGps(centerMap = false) } },
            )
            if (deviceLocation != null) {
                GuruOutlinedButton(
                    text = "Pin at my location",
                    onClick = {
                        val pos = deviceLocation!!
                        shopPin = pos
                        viewCenter = pos
                        onLocationChange(pos.lat, pos.lng)
                        gpsInfo = "Red pin placed at your current location."
                    },
                )
            }
            if (addressText.isNotBlank()) {
                GuruOutlinedButton(
                    text = if (geocoding) "Finding…" else "Find from address",
                    enabled = !geocoding,
                    onClick = {
                        geocoding = true
                        scope.launch {
                            try {
                                val result = api.mapGeocode(addressText)
                                val pin = resolveShopCoords(result.latitude, result.longitude)
                                if (pin != null) {
                                    shopPin = pin
                                    viewCenter = pin
                                    onLocationChange(pin.lat, pin.lng)
                                    gpsInfo = "Pin placed from address. Tap the map to adjust."
                                } else {
                                    gpsError = "Geocoded coordinates are outside Nepal."
                                }
                            } catch (e: Exception) {
                                gpsError = e.message
                            } finally {
                                geocoding = false
                            }
                        }
                    },
                )
            }
            if (shopPin != null) {
                GuruOutlinedButton(
                    text = "Clear pin",
                    onClick = {
                        shopPin = null
                        viewCenter = null
                        onLocationChange(null, null)
                        gpsInfo = "Tap the map to place the red shop pin."
                    },
                )
            }
        }
        Text(
            "Blue dot = you · Red pin = shop · Tap map to place pin",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        gpsError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        Text(gpsInfo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Box(Modifier.fillMaxWidth().height(280.dp)) {
            OsmMapView(
                center = mapCenter,
                zoom = if (shopPin != null || viewCenter != null) 17 else 14,
                markers = markers,
                routeGeoJson = null,
                deviceLocation = deviceLocation,
                onMapClick = { latLng ->
                    shopPin = latLng
                    viewCenter = latLng
                    onLocationChange(latLng.lat, latLng.lng)
                    gpsInfo = "Shop pin saved. Tap again to move it."
                    gpsError = null
                },
                autoFitMarkers = false,
                recenterNonce = recenterNonce,
                modifier = Modifier.fillMaxSize(),
            )
            if (!locating) {
                MapLocationFab(
                    onClick = { scope.launch { refreshGps(centerMap = true) } },
                    modifier = Modifier.align(Alignment.BottomEnd),
                )
            }
        }
    }
}
