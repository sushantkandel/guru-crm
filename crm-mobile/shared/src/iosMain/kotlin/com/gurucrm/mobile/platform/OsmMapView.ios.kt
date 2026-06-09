package com.gurucrm.mobile.platform

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapMarker
import kotlinx.cinterop.ExperimentalForeignApi
import platform.CoreGraphics.CGRectMake
import platform.Foundation.NSURL
import platform.WebKit.WKScriptMessage
import platform.WebKit.WKScriptMessageHandlerProtocol
import platform.WebKit.WKUserContentController
import platform.WebKit.WKWebView
import platform.WebKit.WKWebViewConfiguration
import platform.darwin.NSObject

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun OsmMapView(
    center: LatLng,
    zoom: Int,
    markers: List<MapMarker>,
    routeGeoJson: String?,
    deviceLocation: LatLng?,
    onMapClick: ((LatLng) -> Unit)?,
    onMarkerClick: ((String) -> Unit)?,
    autoFitMarkers: Boolean,
    recenterNonce: Int,
    modifier: Modifier,
) {
    val html = buildMapHtml(
        center = center,
        zoom = zoom,
        markers = markers,
        routeGeoJson = routeGeoJson,
        deviceLocation = deviceLocation,
        clickable = onMapClick != null,
        markerClickable = onMarkerClick != null,
        autoFitMarkers = autoFitMarkers,
    )

    UIKitView(
        modifier = modifier,
        factory = {
            val config = WKWebViewConfiguration()
            val controller = WKUserContentController()
            if (onMarkerClick != null) {
                controller.addScriptMessageHandler(
                    MarkerClickHandler(onMarkerClick),
                    name = "markerClick",
                )
            }
            if (onMapClick != null) {
                controller.addScriptMessageHandler(
                    MapClickHandler(onMapClick),
                    name = "mapClick",
                )
            }
            config.userContentController = controller
            WKWebView(frame = CGRectMake(0.0, 0.0, 0.0, 0.0), configuration = config).apply {
                loadHTMLString(html, baseURL = NSURL(string = "https://localhost/"))
            }
        },
        update = { webView ->
            webView.loadHTMLString(html, baseURL = NSURL(string = "https://localhost/"))
        },
    )
}

private class MarkerClickHandler(
    private val onMarkerClick: (String) -> Unit,
) : NSObject(), WKScriptMessageHandlerProtocol {
    override fun userContentController(
        userContentController: WKUserContentController,
        didReceiveScriptMessage: WKScriptMessage,
    ) {
        val body = didReceiveScriptMessage.body as? Map<*, *> ?: return
        val id = body["id"] as? String ?: return
        onMarkerClick(id)
    }
}

private class MapClickHandler(
    private val onMapClick: (LatLng) -> Unit,
) : NSObject(), WKScriptMessageHandlerProtocol {
    override fun userContentController(
        userContentController: WKUserContentController,
        didReceiveScriptMessage: WKScriptMessage,
    ) {
        val body = didReceiveScriptMessage.body as? Map<*, *> ?: return
        val lat = (body["lat"] as? Number)?.toDouble() ?: return
        val lng = (body["lng"] as? Number)?.toDouble() ?: return
        onMapClick(LatLng(lat, lng))
    }
}
