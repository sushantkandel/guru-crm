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
import com.gurucrm.mobile.data.BalanceDto
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.OrderBalanceDto
import com.gurucrm.mobile.data.OrderDto
import com.gurucrm.mobile.data.PaymentUpsertRequest
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.FilterChipRow
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
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
// Values must match the web app's stored values, not just their display labels.
private val qrProviders = listOf(
    "esewa" to "eSewa",
    "khalti" to "Khalti",
    "fonepay" to "Fonepay",
    "other" to "Other",
)
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
    var customerBalance by remember { mutableStateOf(BalanceDto()) }
    var orderBalance by remember { mutableStateOf<OrderBalanceDto?>(null) }
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
            customerBalance = BalanceDto()
            return@LaunchedEffect
        }
        orders = api.orders(customerId = customerId).filter { it.status != "cancelled" }
        customerBalance = api.customerBalance(customerId)
    }

    LaunchedEffect(orderId) {
        orderBalance = if (orderId.isBlank()) {
            null
        } else {
            runCatching { api.orderBalance(orderId) }.getOrNull()
        }
    }

    LaunchedEffect(paymentId) {
        if (!isEdit) return@LaunchedEffect
        loading = true
        try {
            val p = api.payment(paymentId!!)
            customerId = p.customerId ?: p.customer?.id.orEmpty()
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
    val effectiveStatus = if (isEdit) status else if (paymentType == "credit" || paymentType == "cheque") "pending" else "completed"
    val amountNum = amount.toDoubleOrNull() ?: 0.0
    val remainingAfter = if (effectiveStatus == "completed") {
        (customerBalance.remaining - amountNum).coerceAtLeast(0.0)
    } else {
        customerBalance.remaining
    }

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
                                        text = { Text("${c.shopName} — due Rs ${c.balance.remaining.toLong()}") },
                                        onClick = { customerId = c.id; orderId = ""; customerExpanded = false },
                                    )
                                }
                            }
                        }
                    } else {
                        Text("Customer: ${selectedCustomer?.shopName ?: "—"}")
                    }

                    if (customerId.isNotBlank()) {
                        Column(Modifier.padding(vertical = GuruSpacing.xs)) {
                            Text(
                                "Ordered Rs ${customerBalance.totalOrders.toLong()} · Paid Rs ${customerBalance.totalPaid.toLong()}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "Balance due: Rs ${customerBalance.remaining.toLong()}",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            if (customerBalance.pendingSettlement > 0) {
                                Text(
                                    "Pending credit/cheque: Rs ${customerBalance.pendingSettlement.toLong()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.tertiary,
                                )
                            }
                        }
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
                        orderBalance?.let { ob ->
                            Text(
                                "Order remaining: Rs ${ob.remainingOnOrder.toLong()} (paid Rs ${ob.paidOnOrder.toLong()} of Rs ${ob.orderTotal.toLong()})",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
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
                    if (customerBalance.remaining > 0) {
                        GuruOutlinedButton(
                            text = "Pay full remaining",
                            onClick = {
                                val target = orderBalance?.remainingOnOrder ?: customerBalance.remaining
                                if (target > 0) amount = target.toLong().toString()
                            },
                        )
                        if (amountNum > 0 && effectiveStatus == "completed") {
                            Text(
                                "Rs ${remainingAfter.toLong()} will remain due after this payment",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    GuruTextField(value = paymentDate, onValueChange = { paymentDate = it }, label = "Payment date")

                    when (paymentType) {
                        "cheque" -> {
                            GuruTextField(value = chequeNumber, onValueChange = { chequeNumber = it }, label = "Cheque number")
                            GuruTextField(value = bankName, onValueChange = { bankName = it }, label = "Bank name")
                            if (!isEdit) {
                                Text(
                                    "Cheque payments are saved as pending until marked completed.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        "qr" -> {
                            GuruTextField(value = qrReference, onValueChange = { qrReference = it }, label = "QR reference")
                            Text("Provider", style = MaterialTheme.typography.labelMedium)
                            FilterChipRow(
                                options = qrProviders,
                                // Reflect the real state — highlighting a provider that was
                                // never selected meant the choice was silently dropped on save.
                                selected = qrProvider,
                                onSelect = { qrProvider = it },
                                inset = false,
                            )
                        }
                        "credit" -> {
                            GuruTextField(value = creditDueDate, onValueChange = { creditDueDate = it }, label = "Credit due date")
                            if (!isEdit) {
                                Text(
                                    "Credit is saved as pending. Balance due is unchanged until completed.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
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
                                        val payload = PaymentUpsertRequest(
                                            customerId = customerId,
                                            orderId = orderId.ifBlank { null },
                                            paymentType = paymentType,
                                            amount = amount.toDouble(),
                                            paymentDate = paymentDate,
                                            status = effectiveStatus,
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
