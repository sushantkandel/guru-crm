package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapLocationQuery
import com.gurucrm.mobile.data.MapMarker
import com.gurucrm.mobile.data.ShopDto
import com.gurucrm.mobile.platform.OsmMapView
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.platform.refreshDeviceLocation
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.components.MapLocationFab
import com.gurucrm.mobile.ui.components.GuruFieldRow
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.formatRouteDistance
import com.gurucrm.mobile.util.formatRouteDuration
import com.gurucrm.mobile.util.googleMapsDirectionsUrl
import com.gurucrm.mobile.util.resolveShopCoords
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun MapScreen(
    api: GuruApi,
    platform: PlatformServices,
    onCustomerClick: (String) -> Unit = {},
) {
    var province by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("") }
    var municipality by remember { mutableStateOf("") }
    var ward by remember { mutableStateOf("") }
    var shops by remember { mutableStateOf<List<ShopDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var selectedShop by remember { mutableStateOf<ShopDto?>(null) }
    var deviceLocation by remember { mutableStateOf<LatLng?>(null) }
    var locationFocus by remember { mutableStateOf<LatLng?>(null) }
    var recenterNonce by remember { mutableStateOf(0) }
    var locating by remember { mutableStateOf(false) }
    var locationError by remember { mutableStateOf<String?>(null) }
    var routeGeoJson by remember { mutableStateOf<String?>(null) }
    var routeInfo by remember { mutableStateOf<String?>(null) }
    var plotting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val defaultCenter = LatLng(27.7172, 85.324)

    val query = MapLocationQuery(
        province = province.ifBlank { null },
        district = district.ifBlank { null },
        municipality = municipality.ifBlank { null },
        ward = ward.ifBlank { null },
    )

    LaunchedEffect(Unit) {
        deviceLocation = platform.refreshDeviceLocation()
    }

    LaunchedEffect(province, district, municipality, ward) {
        delay(300)
        loading = true
        error = null
        try {
            shops = api.mapShops(query)
            selectedShop = null
            routeGeoJson = null
            routeInfo = null
        } catch (e: Exception) {
            error = e.message
            shops = emptyList()
        } finally {
            loading = false
        }
    }

    val markers = shops.map { shop ->
        MapMarker(
            id = shop.customerId,
            lat = shop.latitude,
            lng = shop.longitude,
            title = shop.shopName,
            subtitle = "${shop.municipality}, W${shop.ward}",
            isSelected = selectedShop?.customerId == shop.customerId,
        )
    }

    val mapCenter = locationFocus
        ?: selectedShop?.let { LatLng(it.latitude, it.longitude) }
        ?: shops.firstOrNull()?.let { LatLng(it.latitude, it.longitude) }
        ?: deviceLocation
        ?: defaultCenter

    fun centerOnMyLocation() {
        scope.launch {
            locating = true
            locationError = null
            val pos = platform.refreshDeviceLocation()
            deviceLocation = pos
            if (pos != null) {
                locationFocus = pos
                recenterNonce++
            } else {
                locationError = "Allow location access to show your position on the map."
            }
            locating = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        PageHeader(title = "Map", subtitle = "${shops.size} shops · OpenStreetMap")
        Column(
            Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.filterPadding),
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(GuruSpacing.fieldGap),
        ) {
            GuruFieldRow {
                GuruTextField(value = district, onValueChange = { district = it }, label = "District", modifier = Modifier.weight(1f))
                GuruTextField(value = municipality, onValueChange = { municipality = it }, label = "Municipality", modifier = Modifier.weight(1f))
            }
            GuruFieldRow {
                GuruTextField(value = ward, onValueChange = { ward = it }, label = "Ward", modifier = Modifier.weight(1f))
                GuruTextField(value = province, onValueChange = { province = it }, label = "Province", modifier = Modifier.weight(1f))
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(GuruSpacing.screenHorizontal)) }
        locationError?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal))
        }

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .heightIn(min = 240.dp),
        ) {
            OsmMapView(
                center = mapCenter,
                zoom = when {
                    locationFocus != null -> 16
                    selectedShop != null -> 16
                    else -> 12
                },
                markers = markers,
                routeGeoJson = routeGeoJson,
                deviceLocation = deviceLocation,
                onMapClick = null,
                onMarkerClick = { markerId ->
                    locationFocus = null
                    shops.find { it.customerId == markerId }?.let { selectedShop = it }
                },
                autoFitMarkers = locationFocus == null && selectedShop == null,
                recenterNonce = recenterNonce,
                modifier = Modifier.fillMaxSize(),
            )
            if (!locating) {
                MapLocationFab(
                    onClick = { centerOnMyLocation() },
                    modifier = Modifier.align(Alignment.BottomEnd),
                )
            }
            if (loading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        Column(Modifier.padding(GuruSpacing.md)) {
            selectedShop?.let { shop ->
                Text(shop.shopName, style = MaterialTheme.typography.titleMedium)
                Text("${shop.name} · ${shop.phone}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                routeInfo?.let { Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = GuruSpacing.xs)) }
                GuruButtonRow {
                    GuruPrimaryButton(
                        text = if (plotting) "…" else "Plot route",
                        enabled = !plotting,
                        onClick = {
                            plotting = true
                            scope.launch {
                                deviceLocation = platform.refreshDeviceLocation()
                                val dest = resolveShopCoords(shop.latitude, shop.longitude)
                                if (dest == null) { routeInfo = "Invalid shop coordinates"; plotting = false; return@launch }
                                if (deviceLocation == null) { routeInfo = "Allow location to plot route"; plotting = false; return@launch }
                                try {
                                    val route = api.mapRoute(deviceLocation!!, dest)
                                    routeGeoJson = api.routeGeometryJson(route.geometry)
                                    routeInfo = "${formatRouteDistance(route.distanceMeters)} · ~${formatRouteDuration(route.durationSeconds)}"
                                } catch (e: Exception) { routeInfo = e.message }
                                finally { plotting = false }
                            }
                        },
                    )
                    GuruOutlinedButton(
                        text = "Directions",
                        onClick = {
                            scope.launch {
                                val dest = resolveShopCoords(shop.latitude, shop.longitude) ?: return@launch
                                platform.openUrl(googleMapsDirectionsUrl(dest.lat, dest.lng, shop.shopName, platform.getCurrentLocation()))
                            }
                        },
                    )
                    GuruOutlinedButton(text = "View", onClick = { onCustomerClick(shop.customerId) })
                    GuruOutlinedButton(text = "Clear", onClick = { selectedShop = null; routeGeoJson = null; routeInfo = null })
                }
            } ?: run {
                Text("Tap a marker or shop below.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                shops.take(8).forEach { shop ->
                    GuruOutlinedButton(
                        text = "${shop.shopName} — ${shop.municipality}, W${shop.ward}",
                        onClick = { selectedShop = shop },
                        modifier = Modifier.fillMaxWidth().padding(vertical = GuruSpacing.xs),
                    )
                }
            }
        }
    }
}
