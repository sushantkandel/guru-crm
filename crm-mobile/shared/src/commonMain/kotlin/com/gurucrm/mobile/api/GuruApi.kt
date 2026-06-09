package com.gurucrm.mobile.api

import com.gurucrm.mobile.apiBaseUrl
import com.gurucrm.mobile.data.AuthResponse
import com.gurucrm.mobile.data.CustomerDetailDto
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.CustomerQuery
import com.gurucrm.mobile.data.CustomerUpsertRequest
import com.gurucrm.mobile.data.GeocodeRequest
import com.gurucrm.mobile.data.GeocodeResponse
import com.gurucrm.mobile.data.NepalDistrictsResponse
import com.gurucrm.mobile.data.NepalMunicipalitiesResponse
import com.gurucrm.mobile.data.NepalProvincesResponse
import com.gurucrm.mobile.data.NepalWardsResponse
import com.gurucrm.mobile.data.DashboardStatsDto
import com.gurucrm.mobile.data.ErrorResponse
import com.gurucrm.mobile.data.LoginRequest
import com.gurucrm.mobile.data.LatLng
import com.gurucrm.mobile.data.MapLocationQuery
import com.gurucrm.mobile.data.OrderCreateRequest
import com.gurucrm.mobile.data.OrderDto
import com.gurucrm.mobile.data.OrderStatusRequest
import com.gurucrm.mobile.data.OrderUpdateRequest
import com.gurucrm.mobile.data.OutstandingDto
import com.gurucrm.mobile.data.PaymentCreateResponse
import com.gurucrm.mobile.data.PaymentDto
import com.gurucrm.mobile.data.PaymentQuery
import com.gurucrm.mobile.data.PaymentStatusRequest
import com.gurucrm.mobile.data.PaymentUpsertRequest
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.data.RouteResponseDto
import com.gurucrm.mobile.data.ShopDto
import com.gurucrm.mobile.data.TokenStore
import com.gurucrm.mobile.data.UserDto
import kotlinx.serialization.json.JsonElement
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.network.sockets.SocketTimeoutException
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

class ApiException(message: String) : Exception(message)

class GuruApi(private val tokenStore: TokenStore) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = false
    }

    private val client = createPlatformHttpClient {
        install(ContentNegotiation) { json(json) }
        install(Logging) { level = LogLevel.INFO }
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 30_000
        }
        defaultRequest {
            url(apiBaseUrl())
            contentType(ContentType.Application.Json)
        }
    }

    private fun connectionErrorMessage(cause: Throwable?): String {
        val base = apiBaseUrl()
        val detail = cause?.message?.takeIf { it.isNotBlank() } ?: "Connection refused"
        return "Cannot reach API at $base ($detail). " +
            "1) Start backend: cd crm-app/backend && npm run dev " +
            "2) Emulator: run adb reverse tcp:5001 tcp:5001 " +
            "3) Physical phone: set api.base.url=http://YOUR_PC_IP:5001 in crm-mobile/local.properties and rebuild."
    }

    private suspend inline fun <reified T> authorizedGet(
        path: String,
        params: Map<String, String> = emptyMap(),
    ): T {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = client.get("/api$path") {
            header(HttpHeaders.Authorization, "Bearer $token")
            params.forEach { (key, value) -> parameter(key, value) }
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
    }

    private suspend inline fun <reified T> authorizedPost(path: String, body: Any? = null): T {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = client.post("/api$path") {
            header(HttpHeaders.Authorization, "Bearer $token")
            if (body != null) setBody(body)
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
    }

    private suspend inline fun <reified T> authorizedPut(path: String, body: Any? = null): T {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = client.put("/api$path") {
            header(HttpHeaders.Authorization, "Bearer $token")
            if (body != null) setBody(body)
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
    }

    private suspend inline fun <reified T> authorizedPatch(path: String, body: Any): T {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = client.patch("/api$path") {
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody(body)
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
    }

    private suspend fun authorizedDelete(path: String) {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = client.delete("/api$path") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
    }

    private fun parseError(raw: String): String {
        return runCatching { json.decodeFromString<ErrorResponse>(raw).error }
            .getOrNull() ?: "Request failed"
    }

    suspend fun login(email: String, password: String): AuthResponse {
        val response = try {
            client.post("/api/auth/login") {
                setBody(LoginRequest(email, password))
            }
        } catch (e: Exception) {
            if (e is SocketTimeoutException || e is HttpRequestTimeoutException ||
                e.message?.contains("connect", ignoreCase = true) == true ||
                e.message?.contains("Failed to connect", ignoreCase = true) == true
            ) {
                throw ApiException(connectionErrorMessage(e))
            }
            throw ApiException(e.message ?: "Login failed")
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        val auth = response.body<AuthResponse>()
        tokenStore.saveSession(auth.token, auth.user)
        return auth
    }

    suspend fun me(): UserDto = authorizedGet("/auth/me")

    suspend fun restoreSession(): UserDto? {
        val token = tokenStore.getToken() ?: return null
        return try {
            val user = me()
            tokenStore.saveSession(token, user)
            user
        } catch (_: Exception) {
            tokenStore.clear()
            null
        }
    }

    fun logout() {
        tokenStore.clear()
    }

    suspend fun dashboardStats(): DashboardStatsDto = authorizedGet("/dashboard/stats")

    suspend fun customers(query: CustomerQuery = CustomerQuery()): List<CustomerDto> {
        val params = buildMap {
            query.q?.takeIf { it.isNotBlank() }?.let { put("q", it) }
            query.shopName?.takeIf { it.isNotBlank() }?.let { put("shop_name", it) }
            query.customerName?.takeIf { it.isNotBlank() }?.let { put("customer_name", it) }
            query.phone?.takeIf { it.isNotBlank() }?.let { put("phone", it) }
            query.province?.takeIf { it.isNotBlank() }?.let { put("province", it) }
            query.district?.takeIf { it.isNotBlank() }?.let { put("district", it) }
            query.municipality?.takeIf { it.isNotBlank() }?.let { put("municipality", it) }
            query.ward?.takeIf { it.isNotBlank() }?.let { put("ward", it) }
        }
        return authorizedGet("/customers", params)
    }

    suspend fun customer(id: String): CustomerDetailDto = authorizedGet("/customers/$id")

    suspend fun createCustomer(body: CustomerUpsertRequest): String =
        authorizedPost<CustomerDto>("/customers", body).id

    suspend fun updateCustomer(id: String, body: CustomerUpsertRequest) {
        authorizedPut<CustomerDto>("/customers/$id", body)
    }

    suspend fun mapGeocode(address: String): GeocodeResponse =
        authorizedPost("/map/geocode", GeocodeRequest(address))

    suspend fun nepalProvinces(): List<String> =
        authorizedGet<NepalProvincesResponse>("/locations/nepal").provinces

    suspend fun nepalDistricts(province: String): List<String> =
        authorizedGet<NepalDistrictsResponse>("/locations/nepal", mapOf("province" to province)).districts

    suspend fun nepalMunicipalities(province: String, district: String): List<String> =
        authorizedGet<NepalMunicipalitiesResponse>(
            "/locations/nepal",
            mapOf("province" to province, "district" to district),
        ).municipalities

    suspend fun nepalWards(province: String, district: String, municipality: String): List<String> =
        authorizedGet<NepalWardsResponse>(
            "/locations/nepal",
            mapOf("province" to province, "district" to district, "municipality" to municipality),
        ).wards

    suspend fun orders(status: String? = null, customerId: String? = null): List<OrderDto> {
        val params = buildMap {
            status?.takeIf { it.isNotBlank() }?.let { put("status", it) }
            customerId?.takeIf { it.isNotBlank() }?.let { put("customer_id", it) }
        }
        return authorizedGet("/orders", params)
    }

    suspend fun order(id: String): OrderDto = authorizedGet("/orders/$id")

    suspend fun createOrder(body: OrderCreateRequest): OrderDto = authorizedPost("/orders", body)

    suspend fun updateOrder(id: String, body: OrderUpdateRequest): OrderDto = authorizedPut("/orders/$id", body)

    suspend fun updateOrderStatus(id: String, status: String): OrderDto =
        authorizedPatch("/orders/$id/status", OrderStatusRequest(status))

    suspend fun deleteOrder(id: String) = authorizedDelete("/orders/$id")

    suspend fun payment(id: String): PaymentDto = authorizedGet("/payments/$id")

    suspend fun createPayment(body: PaymentUpsertRequest): PaymentDto =
        authorizedPost<PaymentCreateResponse>("/payments", body).payment

    suspend fun updatePayment(id: String, body: PaymentUpsertRequest): PaymentDto =
        authorizedPut("/payments/$id", body)

    suspend fun updatePaymentStatus(id: String, status: String): PaymentDto =
        authorizedPatch("/payments/$id/status", PaymentStatusRequest(status))

    suspend fun deletePayment(id: String) = authorizedDelete("/payments/$id")

    suspend fun products(activeOnly: Boolean = true): List<ProductDto> {
        val params = if (activeOnly) mapOf("active_only" to "true") else emptyMap()
        return authorizedGet("/products", params)
    }

    suspend fun payments(query: PaymentQuery = PaymentQuery()): List<PaymentDto> {
        val params = buildMap {
            query.shopName?.takeIf { it.isNotBlank() }?.let { put("shop_name", it) }
            query.customerName?.takeIf { it.isNotBlank() }?.let { put("customer_name", it) }
            query.phone?.takeIf { it.isNotBlank() }?.let { put("phone", it) }
            query.province?.takeIf { it.isNotBlank() }?.let { put("province", it) }
            query.district?.takeIf { it.isNotBlank() }?.let { put("district", it) }
            query.municipality?.takeIf { it.isNotBlank() }?.let { put("municipality", it) }
            query.ward?.takeIf { it.isNotBlank() }?.let { put("ward", it) }
            query.productId?.takeIf { it.isNotBlank() }?.let { put("product_id", it) }
        }
        return authorizedGet("/payments", params)
    }

    suspend fun outstanding(query: PaymentQuery = PaymentQuery()): List<OutstandingDto> {
        val params = buildMap {
            query.shopName?.takeIf { it.isNotBlank() }?.let { put("shop_name", it) }
            query.customerName?.takeIf { it.isNotBlank() }?.let { put("customer_name", it) }
            query.phone?.takeIf { it.isNotBlank() }?.let { put("phone", it) }
            query.province?.takeIf { it.isNotBlank() }?.let { put("province", it) }
            query.district?.takeIf { it.isNotBlank() }?.let { put("district", it) }
            query.municipality?.takeIf { it.isNotBlank() }?.let { put("municipality", it) }
            query.ward?.takeIf { it.isNotBlank() }?.let { put("ward", it) }
            query.productId?.takeIf { it.isNotBlank() }?.let { put("product_id", it) }
        }
        return authorizedGet("/payments/outstanding", params)
    }

    suspend fun mapShops(query: MapLocationQuery = MapLocationQuery()): List<ShopDto> {
        val params = buildMap {
            query.province?.takeIf { it.isNotBlank() }?.let { put("province", it) }
            query.district?.takeIf { it.isNotBlank() }?.let { put("district", it) }
            query.municipality?.takeIf { it.isNotBlank() }?.let { put("municipality", it) }
            query.ward?.takeIf { it.isNotBlank() }?.let { put("ward", it) }
        }
        return authorizedGet("/map/shops", params)
    }

    suspend fun mapRoute(from: LatLng, to: LatLng): RouteResponseDto {
        val params = mapOf(
            "fromLat" to from.lat.toString(),
            "fromLng" to from.lng.toString(),
            "toLat" to to.lat.toString(),
            "toLng" to to.lng.toString(),
        )
        return authorizedGet("/map/route", params)
    }

    fun routeGeometryJson(geometry: JsonElement): String =
        json.encodeToString(JsonElement.serializer(), geometry)
}
