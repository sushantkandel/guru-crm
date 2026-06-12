package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.OrderCreateRequest
import com.gurucrm.mobile.data.OrderItemInput
import com.gurucrm.mobile.data.OrderUpdateRequest
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.GuruFieldRow
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

private val unitOptions = listOf("packet" to "Packet", "bundle" to "Bundle", "bag" to "Bag")

private data class LineItemState(
    val productId: String? = null,
    val productName: String = "",
    val quantity: String = "1",
    val unit: String = "packet",
    val unitPrice: String = "0",
)

@Composable
fun OrderFormScreen(
    api: GuruApi,
    user: UserDto,
    orderId: String?,
    initialCustomerId: String?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    if (!user.canEdit()) {
        GuruScaffold(title = "Order", onBack = onBack) {
            Text("View-only access", Modifier.padding(GuruSpacing.screenHorizontal))
        }
        return
    }

    val isEdit = orderId != null
    var loading by remember { mutableStateOf(isEdit) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var customers by remember { mutableStateOf<List<CustomerDto>>(emptyList()) }
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var customerId by remember { mutableStateOf(initialCustomerId.orEmpty()) }
    var orderDate by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    val items = remember { mutableStateListOf(LineItemState()) }
    var customerExpanded by remember { mutableStateOf(false) }
    var unitMenuIndex by remember { mutableStateOf<Int?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        loadError = null
        try {
            customers = api.customers()
            products = api.products(activeOnly = true)
        } catch (e: Exception) {
            loadError = e.message ?: "Failed to load customers or products"
        }
        if (orderDate.isBlank()) {
            orderDate = kotlinx.datetime.Clock.System.now().toString().take(10)
        }
    }

    LaunchedEffect(orderId) {
        if (!isEdit) return@LaunchedEffect
        loading = true
        try {
            val order = api.order(orderId!!)
            customerId = order.customerId ?: order.customer?.id.orEmpty()
            orderDate = order.orderDate.take(10)
            notes = order.notes.orEmpty()
            items.clear()
            order.items.forEach { item ->
                items.add(
                    LineItemState(
                        productId = item.productId,
                        productName = item.productName,
                        quantity = item.quantity.toString(),
                        unit = item.unit,
                        unitPrice = item.unitPrice.toString(),
                    ),
                )
            }
            if (items.isEmpty()) items.add(LineItemState())
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val total = items.sumOf {
        (it.quantity.toDoubleOrNull() ?: 0.0) * (it.unitPrice.toDoubleOrNull() ?: 0.0)
    }
    val selectedCustomer = customers.find { it.id == customerId }
    val hasValidLine = items.any { it.productName.isNotBlank() }

    GuruScaffold(
        title = if (isEdit) "Edit order" else "New order",
        subtitle = selectedCustomer?.shopName,
        onBack = onBack,
    ) { padding ->
        when {
            loading -> LoadingScreen()
            loadError != null -> ErrorBanner(loadError!!, onRetry = {
                loadError = null
                scope.launch {
                    try {
                        customers = api.customers()
                        products = api.products(activeOnly = true)
                    } catch (e: Exception) {
                        loadError = e.message ?: "Failed to load customers or products"
                    }
                }
            })
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
                                        text = { Text("${c.shopName} — ${c.name}") },
                                        onClick = { customerId = c.id; customerExpanded = false },
                                    )
                                }
                            }
                        }
                    } else {
                        Text("Customer: ${selectedCustomer?.shopName ?: "—"}")
                    }

                    GuruTextField(value = orderDate, onValueChange = { orderDate = it }, label = "Order date")
                    GuruTextField(value = notes, onValueChange = { notes = it }, label = "Notes (optional)", singleLine = false)

                    GuruSectionTitle("Items")
                    items.forEachIndexed { index, item ->
                        Column(verticalArrangement = Arrangement.spacedBy(GuruSpacing.fieldGap)) {
                            ProductSelect(
                                products = products,
                                selectedName = item.productName,
                                onSelect = { sel ->
                                    items[index] = item.copy(
                                        productId = sel.productId,
                                        productName = sel.productName,
                                        unit = sel.unit,
                                        unitPrice = sel.unitPrice.toString(),
                                    )
                                },
                            )
                            GuruFieldRow {
                                GuruTextField(
                                    value = item.quantity,
                                    onValueChange = { items[index] = item.copy(quantity = it) },
                                    label = "Qty",
                                    modifier = Modifier.weight(1f),
                                )
                                Column(Modifier.weight(1f)) {
                                    GuruPickerField(
                                        value = unitOptions.firstOrNull { it.first == item.unit }?.second ?: item.unit,
                                        label = "Unit",
                                        placeholder = "Select unit",
                                        onOpenPicker = { unitMenuIndex = index },
                                    )
                                    DropdownMenu(
                                        expanded = unitMenuIndex == index,
                                        onDismissRequest = { unitMenuIndex = null },
                                    ) {
                                        unitOptions.forEach { (value, label) ->
                                            DropdownMenuItem(
                                                text = { Text(label) },
                                                onClick = {
                                                    items[index] = item.copy(unit = value)
                                                    unitMenuIndex = null
                                                },
                                            )
                                        }
                                    }
                                }
                            }
                            GuruTextField(
                                value = item.unitPrice,
                                onValueChange = { items[index] = item.copy(unitPrice = it) },
                                label = "Unit price (Rs)",
                            )
                            if (items.size > 1) {
                                GuruOutlinedButton(
                                    text = "Remove line",
                                    onClick = { items.removeAt(index) },
                                )
                            }
                        }
                    }
                    GuruOutlinedButton(text = "Add item", onClick = { items.add(LineItemState()) })

                    Text("Total: Rs ${total.toLong()}", style = MaterialTheme.typography.titleLarge)

                    GuruFormActions {
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        GuruPrimaryButton(
                            text = if (saving) "Saving…" else "Save order",
                            enabled = !saving && customerId.isNotBlank() && hasValidLine,
                            onClick = {
                                saving = true
                                error = null
                                scope.launch {
                                    try {
                                        val parsedItems = items.filter { it.productName.isNotBlank() }.map {
                                            OrderItemInput(
                                                productId = it.productId,
                                                productName = it.productName,
                                                quantity = it.quantity.toDoubleOrNull() ?: 1.0,
                                                unit = it.unit,
                                                unitPrice = it.unitPrice.toDoubleOrNull() ?: 0.0,
                                            )
                                        }
                                        if (isEdit) {
                                            api.updateOrder(
                                                orderId!!,
                                                OrderUpdateRequest(orderDate = orderDate, notes = notes.ifBlank { null }, items = parsedItems),
                                            )
                                        } else {
                                            api.createOrder(
                                                OrderCreateRequest(
                                                    customerId = customerId,
                                                    orderDate = orderDate,
                                                    notes = notes.ifBlank { null },
                                                    items = parsedItems,
                                                ),
                                            )
                                        }
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
