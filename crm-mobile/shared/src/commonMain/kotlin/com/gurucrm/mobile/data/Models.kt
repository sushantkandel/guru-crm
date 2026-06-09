package com.gurucrm.mobile.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val companyId: String,
    val companyName: String = "",
)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class AuthResponse(val token: String, val user: UserDto)

@Serializable
data class ErrorResponse(val error: String? = null)

@Serializable
data class MessageResponse(val message: String = "")

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class CompanyAddressInput(
    val country: String = "Nepal",
    val province: String,
    val district: String,
    val municipality: String,
    val street: String,
)

@Serializable
data class RegisterCompanyRequest(
    val companyName: String,
    val ownerName: String,
    val email: String,
    val password: String,
    val phone: String = "",
    val address: CompanyAddressInput,
)

@Serializable
data class BalanceDto(
    val totalOrders: Double = 0.0,
    val totalPaid: Double = 0.0,
    val remaining: Double = 0.0,
)

@Serializable
data class AddressDto(
    val province: String? = null,
    val district: String? = null,
    val municipality: String? = null,
    val ward: String? = null,
    val street: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)

@Serializable
data class CustomerDto(
    val id: String,
    val name: String,
    val phone: String,
    val email: String? = null,
    val shopName: String,
    val businessStatus: String? = null,
    val address: AddressDto? = null,
    val balance: BalanceDto = BalanceDto(),
    val pendingOrderCount: Int = 0,
    val lastOrderDate: String? = null,
)

@Serializable
data class CustomerDetailDto(
    val id: String,
    val name: String,
    val phone: String,
    val email: String? = null,
    val shopName: String,
    val panVatNumber: String? = null,
    val businessStatus: String? = null,
    val addresses: List<AddressDto> = emptyList(),
    val balance: BalanceDto = BalanceDto(),
    val orders: List<OrderDto> = emptyList(),
    val payments: List<PaymentDto> = emptyList(),
)

@Serializable
data class OrderItemDto(
    val productId: String? = null,
    val productName: String,
    val quantity: Double,
    val unit: String,
    val unitPrice: Double = 0.0,
    val lineTotal: Double = 0.0,
)

@Serializable
data class OrderCustomerRef(val id: String, val shopName: String, val name: String? = null)

@Serializable
data class OrderDto(
    val id: String,
    val customerId: String? = null,
    val orderDate: String,
    val status: String,
    val totalAmount: Double,
    val notes: String? = null,
    val customer: OrderCustomerRef? = null,
    val items: List<OrderItemDto> = emptyList(),
)

@Serializable
data class OrderItemInput(
    val productId: String? = null,
    val productName: String,
    val quantity: Double,
    val unit: String,
    val unitPrice: Double,
)

@Serializable
data class OrderCreateRequest(
    val customerId: String,
    val orderDate: String,
    val notes: String? = null,
    val items: List<OrderItemInput>,
)

@Serializable
data class OrderUpdateRequest(
    val orderDate: String,
    val notes: String? = null,
    val items: List<OrderItemInput>,
)

@Serializable
data class OrderStatusRequest(val status: String)

@Serializable
data class ProductDto(
    val id: String,
    val name: String,
    val productCode: String? = null,
    val defaultUnit: String,
    val defaultPrice: Double,
    val isActive: Boolean = true,
)

@Serializable
data class PaymentCustomerDto(
    val id: String,
    val name: String,
    val shopName: String,
    val phone: String? = null,
    val addresses: List<AddressDto> = emptyList(),
)

@Serializable
data class PaymentDto(
    val id: String,
    val customerId: String? = null,
    val orderId: String? = null,
    val paymentDate: String,
    val paymentType: String,
    val status: String,
    val amount: Double,
    val chequeNumber: String? = null,
    val bankName: String? = null,
    val qrReference: String? = null,
    val qrProvider: String? = null,
    val creditDueDate: String? = null,
    val customer: PaymentCustomerDto,
)

@Serializable
data class PaymentUpsertRequest(
    val customerId: String,
    val orderId: String? = null,
    val paymentType: String,
    val amount: Double,
    val paymentDate: String,
    val status: String = "completed",
    val chequeNumber: String? = null,
    val bankName: String? = null,
    val qrReference: String? = null,
    val qrProvider: String? = null,
    val creditDueDate: String? = null,
)

@Serializable
data class PaymentStatusRequest(val status: String)

@Serializable
data class PaymentCreateResponse(val payment: PaymentDto)

@Serializable
data class OutstandingDto(
    val id: String,
    val name: String,
    val shopName: String,
    val phone: String,
    val balance: BalanceDto,
)

@Serializable
data class DashboardStatsDto(
    val totalCustomers: Int,
    val pendingOrders: Int,
    val totalOutstanding: Double,
    val inactiveCustomers: Int,
    val totalOrders: Int = 0,
)

@Serializable
data class CustomerQuery(
    val q: String? = null,
    @SerialName("shop_name") val shopName: String? = null,
    @SerialName("customer_name") val customerName: String? = null,
    val phone: String? = null,
    val province: String? = null,
    val district: String? = null,
    val municipality: String? = null,
    val ward: String? = null,
    @SerialName("product_id") val productId: String? = null,
)

@Serializable
data class CustomerAddressInput(
    val province: String,
    val district: String,
    val municipality: String,
    val ward: String,
    val street: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isPrimary: Boolean = true,
)

@Serializable
data class CustomerUpsertRequest(
    val name: String,
    val phone: String,
    val email: String? = null,
    val shopName: String,
    val panVatNumber: String? = null,
    val businessStatus: String = "just_visited",
    val assignedTo: String? = null,
    val address: CustomerAddressInput,
)

@Serializable
data class GeocodeRequest(val address: String)

@Serializable
data class GeocodeResponse(
    val latitude: Double,
    val longitude: Double,
    val formattedAddress: String = "",
)

@Serializable
data class NepalProvincesResponse(val provinces: List<String> = emptyList())

@Serializable
data class NepalDistrictsResponse(val districts: List<String> = emptyList())

@Serializable
data class NepalMunicipalitiesResponse(val municipalities: List<String> = emptyList())

@Serializable
data class NepalWardsResponse(val wards: List<String> = emptyList())

@Serializable
data class PaymentQuery(
    @SerialName("shop_name") val shopName: String? = null,
    @SerialName("customer_name") val customerName: String? = null,
    val phone: String? = null,
    val province: String? = null,
    val district: String? = null,
    val municipality: String? = null,
    val ward: String? = null,
    @SerialName("product_id") val productId: String? = null,
)
