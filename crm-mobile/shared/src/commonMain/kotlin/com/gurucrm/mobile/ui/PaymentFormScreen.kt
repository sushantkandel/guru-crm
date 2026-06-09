package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.OrderDto
import com.gurucrm.mobile.data.PaymentUpsertRequest
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.FilterChipRow
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruPickerField
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit
import kotlinx.coroutines.launch

private val paymentTypes = listOf("cash", "credit", "cheque", "qr")
private val qrProviders = listOf("eSewa", "Khalti", "Fonepay", "other")
private val paymentStatuses = listOf("completed", "pending", "bounced")

@Composable
fun PaymentFormScreen(
    api: GuruApi,
    user: UserDto,
    paymentId: String?,
    initialCustomerId: String?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    if (!user.canEdit()) {
        GuruScaffold(title = "Payment", onBack = onBack) {
            Text("View-only access", Modifier.padding(GuruSpacing.screenHorizontal))
        }
        return
    }

    val isEdit = paymentId != null
    var loading by remember { mutableStateOf(isEdit) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var customers by remember { mutableStateOf<List<CustomerDto>>(emptyList()) }
    var orders by remember { mutableStateOf<List<OrderDto>>(emptyList()) }
    var customerId by remember { mutableStateOf(initialCustomerId.orEmpty()) }
    var orderId by remember { mutableStateOf("") }
    var paymentType by remember { mutableStateOf("cash") }
    var amount by remember { mutableStateOf("") }
    var paymentDate by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("completed") }
    var chequeNumber by remember { mutableStateOf("") }
    var bankName by remember { mutableStateOf("") }
    var qrReference by remember { mutableStateOf("") }
    var qrProvider by remember { mutableStateOf("") }
    var creditDueDate by remember { mutableStateOf("") }
    var customerExpanded by remember { mutableStateOf(false) }
    var orderExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        customers = api.customers()
        if (paymentDate.isBlank()) paymentDate = kotlinx.datetime.Clock.System.now().toString().take(10)
    }

    LaunchedEffect(customerId) {
        if (customerId.isBlank()) {
            orders = emptyList()
            return@LaunchedEffect
        }
        orders = api.orders(customerId = customerId).filter { it.status != "cancelled" }
    }

    LaunchedEffect(paymentId) {
        if (!isEdit) return@LaunchedEffect
        loading = true
        try {
            val p = api.payment(paymentId!!)
            customerId = p.customerId ?: p.customer.id
            orderId = p.orderId.orEmpty()
            paymentType = p.paymentType
            amount = p.amount.toString()
            paymentDate = p.paymentDate.take(10)
            status = p.status
            chequeNumber = p.chequeNumber.orEmpty()
            bankName = p.bankName.orEmpty()
            qrReference = p.qrReference.orEmpty()
            qrProvider = p.qrProvider.orEmpty()
            creditDueDate = p.creditDueDate?.take(10).orEmpty()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val selectedCustomer = customers.find { it.id == customerId }
    val selectedOrder = orders.find { it.id == orderId }

    GuruScaffold(
        title = if (isEdit) "Edit payment" else "Record payment",
        subtitle = selectedCustomer?.shopName,
        onBack = onBack,
    ) { padding ->
        when {
            loading -> LoadingScreen()
            else -> Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
                GuruFormColumn(scroll = false) {
                    if (!isEdit) {
                        Column {
                            GuruPickerField(
                                value = selectedCustomer?.shopName ?: "",
                                label = "Customer",
                                placeholder = "Select customer",
                                onOpenPicker = { customerExpanded = true },
                            )
                            DropdownMenu(expanded = customerExpanded, onDismissRequest = { customerExpanded = false }) {
                                customers.forEach { c ->
                                    DropdownMenuItem(
                                        text = { Text("${c.shopName} — remaining Rs ${c.balance.remaining.toLong()}") },
                                        onClick = { customerId = c.id; orderId = ""; customerExpanded = false },
                                    )
                                }
                            }
                        }
                    } else {
                        Text("Customer: ${selectedCustomer?.shopName ?: "—"}")
                    }

                    selectedCustomer?.let {
                        Text(
                            "Remaining balance: Rs ${it.balance.remaining.toLong()}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    if (customerId.isNotBlank()) {
                        Column {
                            GuruPickerField(
                                value = selectedOrder?.let { "Order ${it.orderDate.take(10)} — Rs ${it.totalAmount.toLong()}" } ?: "",
                                label = "Link to order",
                                placeholder = "No order (optional)",
                                onOpenPicker = { orderExpanded = true },
                            )
                            DropdownMenu(expanded = orderExpanded, onDismissRequest = { orderExpanded = false }) {
                                DropdownMenuItem(text = { Text("None") }, onClick = { orderId = ""; orderExpanded = false })
                                orders.forEach { o ->
                                    DropdownMenuItem(
                                        text = { Text("${o.orderDate.take(10)} — Rs ${o.totalAmount.toLong()}") },
                                        onClick = { orderId = o.id; orderExpanded = false },
                                    )
                                }
                            }
                        }
                    }

                    GuruSectionTitle("Payment details")
                    Text("Payment type", style = MaterialTheme.typography.labelLarge)
                    FilterChipRow(
                        options = paymentTypes.map { it to it.replaceFirstChar { c -> c.uppercase() } },
                        selected = paymentType,
                        onSelect = { paymentType = it },
                        inset = false,
                    )

                    GuruTextField(value = amount, onValueChange = { amount = it }, label = "Amount (Rs)")
                    GuruTextField(value = paymentDate, onValueChange = { paymentDate = it }, label = "Payment date")

                    when (paymentType) {
                        "cheque" -> {
                            GuruTextField(value = chequeNumber, onValueChange = { chequeNumber = it }, label = "Cheque number")
                            GuruTextField(value = bankName, onValueChange = { bankName = it }, label = "Bank name")
                        }
                        "qr" -> {
                            GuruTextField(value = qrReference, onValueChange = { qrReference = it }, label = "QR reference")
                            Text("Provider", style = MaterialTheme.typography.labelMedium)
                            FilterChipRow(
                                options = qrProviders.map { it to it },
                                selected = qrProvider.ifBlank { qrProviders.first() },
                                onSelect = { qrProvider = it },
                                inset = false,
                            )
                        }
                        "credit" -> {
                            GuruTextField(value = creditDueDate, onValueChange = { creditDueDate = it }, label = "Credit due date")
                        }
                    }

                    if (isEdit) {
                        Text("Status", style = MaterialTheme.typography.labelLarge)
                        FilterChipRow(
                            options = paymentStatuses.map { it to it.replaceFirstChar { c -> c.uppercase() } },
                            selected = status,
                            onSelect = { status = it },
                            inset = false,
                        )
                    }

                    GuruFormActions {
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        GuruPrimaryButton(
                            text = if (saving) "Saving…" else if (isEdit) "Save changes" else "Record payment",
                            enabled = !saving && customerId.isNotBlank() && amount.toDoubleOrNull() != null,
                            onClick = {
                                saving = true
                                error = null
                                scope.launch {
                                    try {
                                        val finalStatus = if (!isEdit && paymentType == "credit") "pending" else status
                                        val payload = PaymentUpsertRequest(
                                            customerId = customerId,
                                            orderId = orderId.ifBlank { null },
                                            paymentType = paymentType,
                                            amount = amount.toDouble(),
                                            paymentDate = paymentDate,
                                            status = finalStatus,
                                            chequeNumber = chequeNumber.ifBlank { null },
                                            bankName = bankName.ifBlank { null },
                                            qrReference = qrReference.ifBlank { null },
                                            qrProvider = qrProvider.ifBlank { null },
                                            creditDueDate = creditDueDate.ifBlank { null },
                                        )
                                        if (isEdit) api.updatePayment(paymentId!!, payload) else api.createPayment(payload)
                                        onSaved()
                                    } catch (e: Exception) {
                                        error = e.message
                                    } finally {
                                        saving = false
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}
