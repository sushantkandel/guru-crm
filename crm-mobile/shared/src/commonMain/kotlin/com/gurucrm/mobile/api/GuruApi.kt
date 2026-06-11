package com.gurucrm.mobile.api

import com.gurucrm.mobile.apiBaseUrl
import com.gurucrm.mobile.data.AuthResponse
import com.gurucrm.mobile.data.BackupPreviewDto
import com.gurucrm.mobile.data.BackupRestoreResultDto
import com.gurucrm.mobile.data.CustomerDetailDto
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.CustomerProductInsightDto
import com.gurucrm.mobile.data.CustomerQuery
import com.gurucrm.mobile.data.ProductInsightUpsertRequest
import com.gurucrm.mobile.data.CustomerUpsertRequest
import com.gurucrm.mobile.data.GeocodeRequest
import com.gurucrm.mobile.data.GeocodeResponse
import com.gurucrm.mobile.data.NepalDistrictsResponse
import com.gurucrm.mobile.data.NepalMunicipalitiesResponse
import com.gurucrm.mobile.data.NepalProvincesResponse
import com.gurucrm.mobile.data.NepalWardsResponse
import com.gurucrm.mobile.data.DashboardStatsDto
import com.gurucrm.mobile.data.ErrorResponse
import com.gurucrm.mobile.data.ForgotPasswordRequest
import com.gurucrm.mobile.data.GoogleAuthRequest
import com.gurucrm.mobile.data.LoginRequest
import com.gurucrm.mobile.data.MessageResponse
import com.gurucrm.mobile.data.RegisterCompanyRequest
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
import com.gurucrm.mobile.data.ProductUpsertRequest
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
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.readRawBytes
import io.ktor.http.Headers
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json

class ApiException(message: String) : Exception(message)

class AuthException(
    message: String,
    val code: String? = null,
) : Exception(message)

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
            requestTimeoutMillis = 45_000
            connectTimeoutMillis = 25_000
            socketTimeoutMillis = 45_000
        }
        defaultRequest {
            url(apiBaseUrl())
            contentType(ContentType.Application.Json)
        }
    }

    private fun mapNetworkError(e: Exception, fallback: String): ApiException {
        return when {
            e is SocketTimeoutException || e is HttpRequestTimeoutException ->
                ApiException("The server took too long to respond. Wait 30 seconds and try again.")
            e.message?.contains("connect", ignoreCase = true) == true ||
                e.message?.contains("Failed to connect", ignoreCase = true) == true ->
                ApiException("Could not reach the server. It may be waking up — wait a moment and try again.")
            else -> ApiException(e.message ?: fallback)
        }
    }

    private suspend inline fun <reified T> publicGet(
        path: String,
        params: Map<String, String> = emptyMap(),
    ): T {
        val response = client.get("/api$path") {
            params.forEach { (key, value) -> parameter(key, value) }
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
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

    private data class ParsedError(val message: String, val code: String?)

    private fun parseApiError(raw: String): ParsedError {
        val response = runCatching { json.decodeFromString<ErrorResponse>(raw) }.getOrNull()
        return ParsedError(
            message = response?.error ?: "Request failed",
            code = response?.code,
        )
    }

    private fun parseError(raw: String): String = parseApiError(raw).message

    suspend fun login(email: String, password: String): AuthResponse {
        val response = try {
            client.post("/api/auth/login") {
                setBody(LoginRequest(email, password))
            }
        } catch (e: Exception) {
            throw mapNetworkError(e, "Login failed")
        }
        if (!response.status.isSuccess()) {
            val parsed = parseApiError(response.bodyAsText())
            throw AuthException(parsed.message, parsed.code)
        }
        val auth = response.body<AuthResponse>()
        tokenStore.saveSession(auth.token, auth.user)
        return auth
    }

    suspend fun loginWithGoogle(credential: String): AuthResponse {
        val response = try {
            client.post("/api/auth/google") {
                setBody(GoogleAuthRequest(credential))
            }
        } catch (e: Exception) {
            throw mapNetworkError(e, "Google sign-in failed")
        }
        if (!response.status.isSuccess()) {
            val parsed = parseApiError(response.bodyAsText())
            throw AuthException(parsed.message, parsed.code)
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

    suspend fun restoreSessionWithTimeout(timeoutMs: Long = 12_000): UserDto? {
        val token = tokenStore.getToken() ?: return null
        return try {
            withTimeout(timeoutMs) { restoreSession() }
        } catch (_: Exception) {
            tokenStore.clear()
            null
        }
    }

    suspend fun forgotPassword(email: String): String {
        val response = try {
            client.post("/api/auth/forgot-password") {
                setBody(ForgotPasswordRequest(email.trim()))
            }
        } catch (e: Exception) {
            throw mapNetworkError(e, "Request failed")
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body<MessageResponse>().message
    }

    suspend fun registerCompany(body: RegisterCompanyRequest): AuthResponse {
        val response = try {
            client.post("/api/auth/register-company") { setBody(body) }
        } catch (e: Exception) {
            throw mapNetworkError(e, "Registration failed")
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        val auth = response.body<AuthResponse>()
        tokenStore.saveSession(auth.token, auth.user)
        return auth
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
            query.productId?.takeIf { it.isNotBlank() }?.let { put("product_id", it) }
            query.customerType?.takeIf { it.isNotBlank() }?.let { put("customer_type", it) }
            query.knowsProduct?.takeIf { it.isNotBlank() }?.let { put("knows_product", it) }
            query.isSelling?.takeIf { it.isNotBlank() }?.let { put("is_selling", it) }
            query.vendor?.takeIf { it.isNotBlank() }?.let { put("vendor", it) }
            query.vendorCurrentOnly?.takeIf { it.isNotBlank() }?.let { put("vendor_current_only", it) }
        }
        return authorizedGet("/customers", params)
    }

    suspend fun customer(id: String): CustomerDetailDto = authorizedGet("/customers/$id")

    suspend fun customerProductInsights(customerId: String): List<CustomerProductInsightDto> =
        authorizedGet("/customers/$customerId/product-insights")

    suspend fun upsertCustomerProductInsight(
        customerId: String,
        productId: String,
        body: ProductInsightUpsertRequest,
    ): CustomerProductInsightDto =
        authorizedPut("/customers/$customerId/product-insights/$productId", body)

    suspend fun vendorNames(q: String = ""): List<String> {
        val params = if (q.isBlank()) emptyMap() else mapOf("q" to q)
        return authorizedGet("/customers/vendor-names", params)
    }

    suspend fun createCustomer(body: CustomerUpsertRequest): String =
        authorizedPost<CustomerDto>("/customers", body).id

    suspend fun updateCustomer(id: String, body: CustomerUpsertRequest) {
        authorizedPut<CustomerDto>("/customers/$id", body)
    }

    suspend fun mapGeocode(address: String): GeocodeResponse =
        authorizedPost("/map/geocode", GeocodeRequest(address))

    suspend fun nepalProvinces(): List<String> =
        publicGet<NepalProvincesResponse>("/locations/nepal").provinces

    suspend fun nepalDistricts(province: String): List<String> =
        publicGet<NepalDistrictsResponse>("/locations/nepal", mapOf("province" to province)).districts

    suspend fun nepalMunicipalities(province: String, district: String): List<String> =
        publicGet<NepalMunicipalitiesResponse>(
            "/locations/nepal",
            mapOf("province" to province, "district" to district),
        ).municipalities

    suspend fun nepalWards(province: String, district: String, municipality: String): List<String> =
        publicGet<NepalWardsResponse>(
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

    suspend fun products(activeOnly: Boolean = false): List<ProductDto> {
        val params = if (activeOnly) mapOf("active_only" to "true") else emptyMap()
        return authorizedGet("/products", params)
    }

    suspend fun product(id: String): ProductDto = authorizedGet("/products/$id")

    suspend fun createProduct(body: ProductUpsertRequest): ProductDto = authorizedPost("/products", body)

    suspend fun updateProduct(id: String, body: ProductUpsertRequest): ProductDto =
        authorizedPut("/products/$id", body)

    suspend fun deleteProduct(id: String) = authorizedDelete("/products/$id")

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

    private fun backupFileNameFromDisposition(disposition: String?): String {
        if (disposition.isNullOrBlank()) return "sales-guru-backup.zip"
        val match = Regex("filename=\"?([^\";]+)\"?").find(disposition)
        return match?.groupValues?.get(1) ?: "sales-guru-backup.zip"
    }

    suspend fun downloadBackup(): Pair<ByteArray, String> {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = withTimeout(120_000) {
            client.get("/api/backup/export") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        val name = backupFileNameFromDisposition(response.headers[HttpHeaders.ContentDisposition])
        return response.readRawBytes() to name
    }

    suspend fun downloadPreRestoreBackup(): Pair<ByteArray, String> {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = withTimeout(120_000) {
            client.post("/api/backup/pre-restore-export") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        val name = backupFileNameFromDisposition(response.headers[HttpHeaders.ContentDisposition])
        return response.readRawBytes() to name
    }

    suspend fun validateBackup(fileName: String, bytes: ByteArray): BackupPreviewDto {
        return backupMultipartPost("/backup/validate", fileName, bytes)
    }

    suspend fun restoreBackup(fileName: String, bytes: ByteArray): BackupRestoreResultDto {
        return backupMultipartPost("/backup/restore", fileName, bytes, confirm = "RESTORE")
    }

    private suspend inline fun <reified T> backupMultipartPost(
        path: String,
        fileName: String,
        bytes: ByteArray,
        confirm: String? = null,
    ): T {
        val token = tokenStore.getToken() ?: throw ApiException("Not signed in")
        val response = withTimeout(120_000) {
            client.post("/api$path") {
                header(HttpHeaders.Authorization, "Bearer $token")
                setBody(
                    MultiPartFormDataContent(
                        formData {
                            append(
                                "file",
                                bytes,
                                Headers.build {
                                    append(HttpHeaders.ContentDisposition, "filename=\"$fileName\"")
                                    append(HttpHeaders.ContentType, "application/zip")
                                },
                            )
                            if (confirm != null) {
                                append("confirm", confirm)
                            }
                        },
                    ),
                )
            }
        }
        if (!response.status.isSuccess()) {
            throw ApiException(parseError(response.bodyAsText()))
        }
        return response.body()
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
