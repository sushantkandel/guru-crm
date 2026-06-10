package com.gurucrm.mobile

import MainView
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.gurucrm.mobile.platform.AndroidAppContext
import com.gurucrm.mobile.platform.BackupFileBridge

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AndroidAppContext.context = applicationContext
        AndroidAppContext.activity = this
        BackupFileBridge.registerPickLauncher(this)
        BackupFileBridge.registerSaveLauncher(this)
        requestLocationIfNeeded()
        setContent {
            MainView()
        }
    }

    private fun requestLocationIfNeeded() {
        val needed = LOCATION_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), LOCATION_REQUEST_CODE)
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
