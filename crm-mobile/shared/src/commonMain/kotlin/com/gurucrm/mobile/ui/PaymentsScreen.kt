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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import com.gurucrm.mobile.data.OutstandingDto
import com.gurucrm.mobile.data.PaymentDto
import com.gurucrm.mobile.data.PaymentQuery
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.BalanceChip
import com.gurucrm.mobile.ui.components.EmptyState
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruFieldRow
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PaymentsScreen(
    api: GuruApi,
    user: UserDto,
    listRefreshKey: Long = 0L,
    onRecordPayment: (String) -> Unit,
    onEditPayment: (String) -> Unit,
) {
    var tab by remember { mutableStateOf(0) }
    var shopName by remember { mutableStateOf("") }
    var customerName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var outstanding by remember { mutableStateOf<List<OutstandingDto>>(emptyList()) }
    var pendingPayments by remember { mutableStateOf<List<PaymentDto>>(emptyList()) }
    var payments by remember { mutableStateOf<List<PaymentDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()
    val query = PaymentQuery(
        shopName = shopName.ifBlank { null },
        customerName = customerName.ifBlank { null },
        phone = phone.ifBlank { null },
    )

    LaunchedEffect(tab, shopName, customerName, phone, refreshKey, listRefreshKey) {
        delay(300)
        loading = true
        error = null
        try {
            when (tab) {
                0 -> outstanding = api.outstanding(query)
                1 -> pendingPayments = api.payments(query.copy(status = "pending"))
                else -> payments = api.payments(query.copy(status = "completed"))
            }
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val subtitle = when (tab) {
        0 -> "Shops with balance due"
        1 -> "Pending credit and cheque"
        else -> "Completed payments"
    }

    androidx.compose.material3.Scaffold(
        floatingActionButton = {
            if (user.canEdit() && tab != 2) {
                FloatingActionButton(onClick = { onRecordPayment("") }) {
                    Icon(Icons.Default.Add, contentDescription = "Record payment")
                }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            PageHeader(title = "Payments", subtitle = subtitle, onRefresh = { refreshKey++ })
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Balance due") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Pending") })
                Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text("History") })
            }
            Column(
                Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.filterPadding),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(GuruSpacing.fieldGap),
            ) {
                GuruTextField(value = shopName, onValueChange = { shopName = it }, label = "Shop name")
                GuruFieldRow {
                    GuruTextField(value = customerName, onValueChange = { customerName = it }, label = "Customer", modifier = Modifier.weight(1f))
                    GuruTextField(value = phone, onValueChange = { phone = it }, label = "Phone", modifier = Modifier.weight(1f))
                }
            }
            when {
                loading -> LoadingScreen()
                error != null -> ErrorBanner(error!!, onRetry = { refreshKey++ })
                tab == 0 && outstanding.isEmpty() -> EmptyState("No outstanding balances")
                tab == 1 && pendingPayments.isEmpty() -> EmptyState("No pending credit or cheque payments")
                tab == 2 && payments.isEmpty() -> EmptyState("No completed payments")
                tab == 0 -> LazyColumn {
                    items(outstanding, key = { it.id }) { row ->
                        GuruCard {
                            Text(row.shopName, style = MaterialTheme.typography.titleSmall)
                            Text(row.name, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                "Ordered Rs ${row.balance.totalOrders.toLong()} · Paid Rs ${row.balance.totalPaid.toLong()}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = GuruSpacing.xs),
                            )
                            BalanceChip(row.balance.remaining, modifier = Modifier.padding(vertical = GuruSpacing.xs))
                            if (row.balance.pendingSettlement > 0) {
                                Text(
                                    "Pending credit/cheque: Rs ${row.balance.pendingSettlement.toLong()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.tertiary,
                                )
                            }
                            if (user.canEdit()) {
                                GuruPrimaryButton(text = "Record payment", onClick = { onRecordPayment(row.id) })
                            }
                        }
                    }
                }
                tab == 1 -> LazyColumn {
                    items(pendingPayments, key = { it.id }) { payment ->
                        GuruCard(onClick = { if (user.canEdit()) onEditPayment(payment.id) }) {
                            Text(payment.customer?.shopName ?: "—", style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.padding(vertical = GuruSpacing.xs)) {
                                StatusBadge(payment.status)
                                Text(
                                    " · ${payment.paymentType} · ${payment.paymentDate.take(10)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text("Rs ${payment.amount.toLong()}", style = MaterialTheme.typography.titleMedium)
                            if (user.canEdit()) {
                                GuruOutlinedButton(
                                    text = "Mark complete",
                                    onClick = {
                                        scope.launch {
                                            api.updatePaymentStatus(payment.id, "completed")
                                            refreshKey++
                                        }
                                    },
                                    modifier = Modifier.padding(top = GuruSpacing.sm),
                                )
                            }
                        }
                    }
                }
                else -> LazyColumn {
                    items(payments, key = { it.id }) { payment ->
                        GuruCard(onClick = { if (user.canEdit()) onEditPayment(payment.id) }) {
                            Text(payment.customer?.shopName ?: "—", style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.padding(vertical = GuruSpacing.xs)) {
                                StatusBadge(payment.status)
                                Text(
                                    " · ${payment.paymentType} · ${payment.paymentDate.take(10)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text("Rs ${payment.amount.toLong()}", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
    }
}
