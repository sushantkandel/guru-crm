package com.gurucrm.mobile.platform

import com.gurucrm.mobile.data.LatLng
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse
import platform.CoreLocation.kCLAuthorizationStatusDenied
import platform.CoreLocation.kCLAuthorizationStatusNotDetermined
import platform.CoreLocation.kCLAuthorizationStatusRestricted
import platform.CoreLocation.kCLLocationAccuracyBest
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.darwin.NSObject
import kotlin.coroutines.resume

actual fun createPlatformServices(): PlatformServices = IosPlatformServices()

@OptIn(ExperimentalForeignApi::class)
class IosPlatformServices : PlatformServices {
    override fun openUrl(url: String) {
        val nsUrl = NSURL(string = url) ?: return
        UIApplication.sharedApplication.openURL(nsUrl)
    }

    override fun hasLocationPermission(): Boolean {
        val status = CLLocationManager.authorizationStatus()
        return status == kCLAuthorizationStatusAuthorizedWhenInUse ||
            status == kCLAuthorizationStatusAuthorizedAlways
    }

    override fun requestLocationPermission() {
        CLLocationManager().requestWhenInUseAuthorization()
    }

    override suspend fun getCurrentLocation(): LatLng? = suspendCancellableCoroutine { cont ->
        if (!CLLocationManager.locationServicesEnabled()) {
            cont.resume(null)
            return@suspendCancellableCoroutine
        }

        val manager = CLLocationManager()
        val delegate = object : NSObject(), CLLocationManagerDelegateProtocol {
            override fun locationManager(manager: CLLocationManager, didUpdateLocations: List<*>) {
                val location = didUpdateLocations.lastOrNull() as? CLLocation
                manager.stopUpdatingLocation()
                manager.delegate = null
                if (location != null && cont.isActive) {
                    location.coordinate.useContents {
                        cont.resume(LatLng(latitude, longitude))
                    }
                } else if (cont.isActive) {
                    cont.resume(null)
                }
            }

            override fun locationManager(manager: CLLocationManager, didFailWithError: platform.Foundation.NSError) {
                manager.stopUpdatingLocation()
                manager.delegate = null
                if (cont.isActive) cont.resume(null)
            }

            override fun locationManagerDidChangeAuthorization(manager: CLLocationManager) {
                when (manager.authorizationStatus) {
                    kCLAuthorizationStatusAuthorizedWhenInUse,
                    kCLAuthorizationStatusAuthorizedAlways,
                    -> {
                        manager.desiredAccuracy = kCLLocationAccuracyBest
                        manager.startUpdatingLocation()
                    }
                    kCLAuthorizationStatusDenied,
                    kCLAuthorizationStatusRestricted,
                    -> {
                        if (cont.isActive) cont.resume(null)
                    }
                }
            }
        }

        manager.delegate = delegate
        manager.desiredAccuracy = kCLLocationAccuracyBest

        when (manager.authorizationStatus) {
            kCLAuthorizationStatusNotDetermined -> manager.requestWhenInUseAuthorization()
            kCLAuthorizationStatusAuthorizedWhenInUse,
            kCLAuthorizationStatusAuthorizedAlways,
            -> manager.startUpdatingLocation()
            else -> cont.resume(null)
        }

        cont.invokeOnCancellation {
            manager.stopUpdatingLocation()
            manager.delegate = null
        }
    }
}
