package com.gurucrm.mobile.platform

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapMarker
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Composable
expect fun OsmMapView(
    center: LatLng,
    zoom: Int,
    markers: List<MapMarker>,
    routeGeoJson: String?,
    deviceLocation: LatLng?,
    onMapClick: ((LatLng) -> Unit)?,
    onMarkerClick: ((String) -> Unit)? = null,
    /** When false, keep [center]/[zoom] instead of zooming to fit every marker. */
    autoFitMarkers: Boolean = true,
    /** Increment to fly the map to [center] without a full WebView reload. */
    recenterNonce: Int = 0,
    modifier: Modifier = Modifier,
)

fun buildMapHtml(
    center: LatLng,
    zoom: Int,
    markers: List<MapMarker>,
    routeGeoJson: String?,
    deviceLocation: LatLng?,
    clickable: Boolean,
    markerClickable: Boolean,
    autoFitMarkers: Boolean = true,
): String {
    val autoFitFlag = if (autoFitMarkers) "true" else "false"
    val markersJson = Json.encodeToString(markers)
    val routeJson = routeGeoJson ?: "null"
    val deviceJson = deviceLocation?.let { """{"lat":${it.lat},"lng":${it.lng}}""" } ?: "null"
    val clickFlag = if (clickable) "true" else "false"
    val markerClickFlag = if (markerClickable) "true" else "false"
    return """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="leaflet.css" />
  <script src="leaflet.js"></script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    #map { min-height: 200px; background: #e2e8f0; }
    .shop-label {
      background: #fff; border: 2px solid #dc2626; color: #991b1b;
      font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const center = { lat: ${center.lat}, lng: ${center.lng} };
  const markers = $markersJson;
  const routeGeo = $routeJson;
  const device = $deviceJson;
  const clickable = $clickFlag;
  const markerClickable = $markerClickFlag;
  const autoFitMarkers = $autoFitFlag;

  if (typeof L === 'undefined') {
    document.getElementById('map').innerHTML =
      '<p style="padding:12px;color:#b91c1c;font:14px sans-serif">Map library failed to load.</p>';
    throw new Error('Leaflet not loaded');
  }

  const map = L.map('map', { zoomControl: true }).setView([center.lat, center.lng], $zoom);
  window.__guruMap = map;
  function invalidateMapSize() {
    if (window.__guruMap) window.__guruMap.invalidateSize({ animate: false });
  }
  window.flyToMap = function(lat, lng, z) {
    if (!window.__guruMap) return;
    window.__guruMap.flyTo([lat, lng], z, { animate: true, duration: 0.6 });
    setTimeout(invalidateMapSize, 650);
  };
  invalidateMapSize();
  requestAnimationFrame(invalidateMapSize);
  setTimeout(invalidateMapSize, 50);
  setTimeout(invalidateMapSize, 300);
  window.addEventListener('resize', invalidateMapSize);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const shopIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#dc2626;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.35);"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7]
  });

  const bounds = [];
  markers.forEach(m => {
    const latlng = [m.lat, m.lng];
    bounds.push(latlng);
    const marker = L.marker(latlng, { icon: shopIcon }).addTo(map);
    if (m.title) marker.bindTooltip(m.title, { permanent: true, direction: 'top', className: 'shop-label' });
    marker.bindPopup('<b>' + m.title + '</b><br/>' + (m.subtitle || ''));
    if (markerClickable) {
      marker.on('click', function() {
        if (window.AndroidMapBridge && window.AndroidMapBridge.onMarkerClick) {
          AndroidMapBridge.onMarkerClick(m.id);
        } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.markerClick) {
          window.webkit.messageHandlers.markerClick.postMessage({ id: m.id });
        }
      });
    }
  });

  if (device) {
    const dot = L.circleMarker([device.lat, device.lng], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#4285f4', fillOpacity: 1
    }).addTo(map);
    dot.bindTooltip('You', { permanent: false, direction: 'right' });
    bounds.push([device.lat, device.lng]);
  }

  if (routeGeo) {
    try {
      const geo = typeof routeGeo === 'string' ? JSON.parse(routeGeo) : routeGeo;
      L.geoJSON(geo, { style: { color: '#2563eb', weight: 5, opacity: 0.85 } }).addTo(map);
    } catch (e) {}
  }

  if (autoFitMarkers && bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  if (clickable) {
    map.on('click', function(e) {
      if (window.AndroidMapBridge) {
        AndroidMapBridge.onMapClick(e.latlng.lat, e.latlng.lng);
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mapClick) {
        window.webkit.messageHandlers.mapClick.postMessage({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
  }
</script>
</body>
</html>
    """.trimIndent()
}
