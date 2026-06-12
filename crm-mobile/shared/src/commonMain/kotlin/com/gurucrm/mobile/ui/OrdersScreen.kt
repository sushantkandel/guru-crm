package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
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
import com.gurucrm.mobile.data.OrderDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.EmptyState
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.FilterChipRow
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit
import kotlinx.coroutines.launch

private val statusFilters = listOf(
    "" to "All",
    "pending" to "Pending",
    "confirmed" to "Confirmed",
    "delivered" to "Delivered",
    "cancelled" to "Cancelled",
)

@Composable
fun OrdersScreen(
    api: GuruApi,
    user: UserDto,
    listRefreshKey: Long = 0L,
    onOrderClick: (String) -> Unit,
    onNewOrder: (String?) -> Unit,
) {
    var statusFilter by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var orders by remember { mutableStateOf<List<OrderDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(statusFilter, refreshKey, listRefreshKey) {
        loading = true
        error = null
        try {
            orders = api.orders(status = statusFilter.ifBlank { null })
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    androidx.compose.material3.Scaffold(
        floatingActionButton = {
            if (user.canEdit()) {
                FloatingActionButton(onClick = { onNewOrder(null) }) {
                    Icon(Icons.Default.Add, contentDescription = "New order")
                }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            PageHeader(title = "Orders", subtitle = "Track order workflow", onRefresh = { refreshKey++ })
            FilterChipRow(options = statusFilters, selected = statusFilter, onSelect = { statusFilter = it })
            when {
                loading -> LoadingScreen()
                error != null -> ErrorBanner(error!!, onRetry = { refreshKey++ })
                orders.isEmpty() -> EmptyState("No orders")
                else -> LazyColumn {
                    items(orders, key = { it.id }) { order ->
                        GuruCard(onClick = { onOrderClick(order.id) }) {
                            Text(order.customer?.shopName ?: "—", style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.padding(vertical = GuruSpacing.xs)) {
                                StatusBadge(order.status)
                                Text(
                                    " · ${order.orderDate.take(10)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text("Rs ${order.totalAmount.toLong()}", style = MaterialTheme.typography.titleMedium)
                            if (user.canEdit()) {
                                GuruButtonRow {
                                    when (order.status) {
                                        "pending" -> {
                                            GuruPrimaryButton(
                                                text = "Confirm",
                                                onClick = { scope.launch { api.updateOrderStatus(order.id, "confirmed"); refreshKey++ } },
                                            )
                                            GuruOutlinedButton(
                                                text = "Cancel",
                                                onClick = { scope.launch { api.updateOrderStatus(order.id, "cancelled"); refreshKey++ } },
                                            )
                                        }
                                        "confirmed" -> {
                                            GuruPrimaryButton(
                                                text = "Deliver",
                                                onClick = { scope.launch { api.updateOrderStatus(order.id, "delivered"); refreshKey++ } },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

