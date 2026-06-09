package com.gurucrm.mobile.platform

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import com.gurucrm.mobile.data.LatLng
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object AndroidAppContext {
    lateinit var context: android.content.Context
    var activity: android.app.Activity? = null
}

actual fun createPlatformServices(): PlatformServices = AndroidPlatformServices()

class AndroidPlatformServices : PlatformServices {
    override fun openUrl(url: String) {
        val ctx = AndroidAppContext.context
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
    }

    override fun hasLocationPermission(): Boolean {
        val ctx = AndroidAppContext.context
        val fine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION)
        return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
    }

    override fun requestLocationPermission() {
        val activity = AndroidAppContext.activity ?: return
        val needed = LOCATION_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            androidx.core.app.ActivityCompat.requestPermissions(activity, needed.toTypedArray(), LOCATION_REQUEST_CODE)
        }
    }

    override suspend fun getCurrentLocation(): LatLng? {
        if (!hasLocationPermission()) return null

        val ctx = AndroidAppContext.context
        val client = LocationServices.getFusedLocationProviderClient(ctx)
        return suspendCancellableCoroutine { cont ->
            val token = CancellationTokenSource()
            client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, token.token)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        cont.resume(LatLng(location.latitude, location.longitude))
                    } else {
                        client.lastLocation
                            .addOnSuccessListener { last ->
                                cont.resume(
                                    last?.let { LatLng(it.latitude, it.longitude) },
                                )
                            }
                            .addOnFailureListener { cont.resume(null) }
                    }
                }
                .addOnFailureListener {
                    client.lastLocation
                        .addOnSuccessListener { last ->
                            cont.resume(last?.let { loc -> LatLng(loc.latitude, loc.longitude) })
                        }
                        .addOnFailureListener { cont.resume(null) }
                }
        }
    }

    companion object {
        private val LOCATION_PERMISSIONS = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        private const val LOCATION_REQUEST_CODE = 1001
    }
}
