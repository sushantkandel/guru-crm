package com.gurucrm.mobile.platform

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapMarker

@SuppressLint("SetJavaScriptEnabled")
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
    val html = remember(center, zoom, markers, routeGeoJson, deviceLocation, autoFitMarkers, onMapClick != null, onMarkerClick != null) {
        buildMapHtml(
            center,
            zoom,
            markers,
            routeGeoJson,
            deviceLocation,
            onMapClick != null,
            onMarkerClick != null,
            autoFitMarkers,
        )
    }
    val assetBase = remember { mapAssetBaseUrl() }
    val currentOnMapClick = rememberUpdatedState(onMapClick)
    val currentOnMarkerClick = rememberUpdatedState(onMarkerClick)
    val currentCenter = rememberUpdatedState(center)
    val currentZoom = rememberUpdatedState(zoom)
    val currentRecenterNonce = rememberUpdatedState(recenterNonce)
    val mainHandler = remember { Handler(Looper.getMainLooper()) }
    val lastFlownNonce = remember { mutableIntStateOf(-1) }

    fun flyTo(webView: WebView) {
        val target = currentCenter.value
        val z = currentZoom.value
        webView.evaluateJavascript(
            "if (typeof flyToMap === 'function') flyToMap(${target.lat}, ${target.lng}, $z);",
            null,
        )
    }

    AndroidView(
        modifier = modifier,
        factory = { context ->
            val assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                .build()

            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    loadsImagesAutomatically = true
                    allowFileAccess = true
                    allowContentAccess = true
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    cacheMode = WebSettings.LOAD_DEFAULT
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView,
                        request: WebResourceRequest,
                    ) = assetLoader.shouldInterceptRequest(request.url)

                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        view?.evaluateJavascript(
                            "if (typeof invalidateMapSize === 'function') invalidateMapSize();",
                            null,
                        )
                        val nonce = currentRecenterNonce.value
                        if (nonce > lastFlownNonce.intValue) {
                            view?.let { flyTo(it) }
                            lastFlownNonce.intValue = nonce
                        }
                    }
                }
                addJavascriptInterface(
                    object {
                        @JavascriptInterface
                        fun onMapClick(lat: Double, lng: Double) {
                            mainHandler.post {
                                currentOnMapClick.value?.invoke(LatLng(lat, lng))
                            }
                        }

                        @JavascriptInterface
                        fun onMarkerClick(id: String) {
                            mainHandler.post {
                                currentOnMarkerClick.value?.invoke(id)
                            }
                        }
                    },
                    "AndroidMapBridge",
                )
                loadDataWithBaseURL(assetBase, html, "text/html", "UTF-8", null)
            }
        },
        update = { webView ->
            if (webView.tag != html) {
                webView.loadDataWithBaseURL(assetBase, html, "text/html", "UTF-8", null)
                webView.tag = html
            } else if (currentRecenterNonce.value > lastFlownNonce.intValue) {
                flyTo(webView)
                lastFlownNonce.intValue = currentRecenterNonce.value
            }
        },
    )
}
