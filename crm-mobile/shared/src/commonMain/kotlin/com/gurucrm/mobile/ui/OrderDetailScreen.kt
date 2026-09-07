package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.OrderDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.ConfirmDialog
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.components.GuruDangerButton
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canDelete
import com.gurucrm.mobile.util.canEdit
import kotlinx.coroutines.launch

/** Quantities can be fractional (e.g. 2.5 bags), so they must not be truncated to whole units. */
private fun formatQuantity(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

@Composable
fun OrderDetailScreen(
    api: GuruApi,
    user: UserDto,
    orderId: String,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onCustomerClick: (String) -> Unit,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var order by remember { mutableStateOf<OrderDto?>(null) }
    var customerRemaining by remember { mutableStateOf(0.0) }
    var showDelete by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            try {
                val loaded = api.order(orderId)
                order = loaded
                customerRemaining = loaded.customer?.id?.let { cid ->
                    api.customerBalance(cid).remaining
                } ?: 0.0
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    // The server rejects some transitions (e.g. delivering an order that still has a
    // balance). Without this guard the exception escapes the coroutine and kills the app.
    fun changeStatus(status: String) {
        scope.launch {
            actionError = null
            try {
                api.updateOrderStatus(orderId, status)
                reload()
            } catch (e: Exception) {
                actionError = e.message ?: "Could not update the order"
            }
        }
    }

    LaunchedEffect(orderId) { reload() }

    val o = order
    GuruScaffold(
        title = o?.customer?.shopName ?: "Order",
        subtitle = o?.orderDate?.take(10),
        onBack = onBack,
    ) { padding ->
        when {
            loading -> LoadingScreen()
            error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(GuruSpacing.screenHorizontal))
            o != null -> Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(GuruSpacing.screenHorizontal, GuruSpacing.screenVertical),
                verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StatusBadge(o.status)
                    Text(
                        " · Rs ${o.totalAmount.toLong()}",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(start = GuruSpacing.sm),
                    )
                }
                o.customer?.let { c ->
                    GuruOutlinedButton(text = "View customer: ${c.shopName}", onClick = { onCustomerClick(c.id) })
                }
                o.notes?.takeIf { it.isNotBlank() }?.let {
                    Text("Notes: $it", style = MaterialTheme.typography.bodyMedium)
                }

                GuruSectionTitle("Items")
                o.items.forEach { item ->
                    Text(
                        "${item.productName} · ${formatQuantity(item.quantity)} ${item.unit} @ Rs ${item.unitPrice.toLong()}",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = GuruSpacing.listItemVertical),
                    )
                }

                if (user.canEdit()) {
                    actionError?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                    GuruButtonRow(modifier = Modifier.padding(top = GuruSpacing.sm)) {
                        when (o.status) {
                            "pending" -> {
                                GuruPrimaryButton(text = "Confirm", onClick = { changeStatus("confirmed") })
                                GuruOutlinedButton(text = "Cancel", onClick = { changeStatus("cancelled") })
                            }
                            "confirmed" -> {
                                GuruPrimaryButton(text = "Deliver", onClick = { changeStatus("delivered") })
                                GuruOutlinedButton(text = "Cancel", onClick = { changeStatus("cancelled") })
                            }
                        }
                    }
                    if (o.status != "delivered") {
                        GuruOutlinedButton(text = "Edit order", onClick = onEdit, modifier = Modifier.padding(top = GuruSpacing.sm))
                    }
                }
                if (user.canDelete() && customerRemaining <= 0) {
                    GuruDangerButton(text = "Delete order", onClick = { showDelete = true }, modifier = Modifier.padding(top = GuruSpacing.sm))
                } else if (user.canDelete() && customerRemaining > 0) {
                    Text(
                        "Cannot delete while Rs ${customerRemaining.toLong()} balance remains.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = GuruSpacing.sm),
                    )
                }
            }
        }
    }

    if (showDelete) {
        ConfirmDialog(
            title = "Delete order?",
            message = "This cannot be undone.",
            confirmLabel = "Delete",
            loading = deleting,
            onConfirm = {
                deleting = true
                scope.launch {
                    try {
                        api.deleteOrder(orderId)
                        showDelete = false
                        onBack()
                    } catch (e: Exception) {
                        error = e.message
                        showDelete = false
                    } finally {
                        deleting = false
                    }
                }
            },
            onDismiss = { showDelete = false },
        )
    }
}
