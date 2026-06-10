import java.io.FileInputStream
import java.util.Properties

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        load(FileInputStream(file))
    }
}
// Flavor API URLs — override in local.properties (not committed):
//   api.base.url.develop=http://10.0.2.2:5001
//   api.base.url.live=https://guru-crm.onrender.com
val liveApiBaseUrl: String =
    localProperties.getProperty("api.base.url.live")
        ?: localProperties.getProperty("api.base.url")
        ?: "https://guru-crm.onrender.com"
val developApiBaseUrl: String =
    localProperties.getProperty("api.base.url.develop")
        ?: localProperties.getProperty("api.base.url")
        ?: "http://10.0.2.2:5001"
val googleWebClientId: String = localProperties.getProperty("google.web.client.id") ?: ""

plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    kotlin("plugin.compose")
    id("com.android.library")
    id("org.jetbrains.compose")
}

kotlin {
    androidTarget()

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "shared"
            isStatic = true
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.materialIconsExtended)
                implementation("org.jetbrains.androidx.navigation:navigation-compose:2.9.0-beta03")
                implementation("io.ktor:ktor-client-core:3.1.3")
                implementation("io.ktor:ktor-client-content-negotiation:3.1.3")
                implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.3")
                implementation("io.ktor:ktor-client-logging:3.1.3")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.2")
                implementation("com.russhwolf:multiplatform-settings:1.3.0")
                implementation("com.russhwolf:multiplatform-settings-no-arg:1.3.0")
                implementation(compose.components.resources)
            }
        }
        val androidMain by getting {
            dependencies {
                implementation("androidx.webkit:webkit:1.12.1")
                implementation("io.ktor:ktor-client-okhttp:3.1.3")
                implementation("com.google.android.gms:play-services-location:21.3.0")
                implementation("androidx.credentials:credentials:1.3.0")
                implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
                implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
                api("androidx.activity:activity-compose:1.10.1")
                api("androidx.appcompat:appcompat:1.7.0")
                api("androidx.core:core-ktx:1.15.0")
            }
        }
        val iosX64Main by getting
        val iosArm64Main by getting
        val iosSimulatorArm64Main by getting
        val iosMain by creating {
            dependsOn(commonMain)
            iosX64Main.dependsOn(this)
            iosArm64Main.dependsOn(this)
            iosSimulatorArm64Main.dependsOn(this)
            dependencies {
                implementation("io.ktor:ktor-client-darwin:3.1.3")
            }
        }
    }
}

android {
    compileSdk = (findProperty("android.compileSdk") as String).toInt()
    namespace = "com.gurucrm.mobile.shared"

    sourceSets["main"].manifest.srcFile("src/androidMain/AndroidManifest.xml")
    sourceSets["main"].res.srcDirs("src/androidMain/res")
    sourceSets["main"].resources.srcDirs("src/commonMain/resources")

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        minSdk = (findProperty("android.minSdk") as String).toInt()
    }

    flavorDimensions += "environment"
    productFlavors {
        create("develop") {
            dimension = "environment"
            buildConfigField("String", "API_BASE_URL", "\"$developApiBaseUrl\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
            buildConfigField("String", "APP_FLAVOR", "\"develop\"")
        }
        create("live") {
            dimension = "environment"
            buildConfigField("String", "API_BASE_URL", "\"$liveApiBaseUrl\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
            buildConfigField("String", "APP_FLAVOR", "\"live\"")
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        jvmToolchain(17)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.gurucrm.mobile.generated.resources"
}
