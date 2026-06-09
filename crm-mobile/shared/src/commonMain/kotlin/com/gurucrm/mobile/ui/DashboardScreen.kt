package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.DashboardStatsDto
import com.gurucrm.mobile.data.OutstandingDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.BalanceChip
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit

@Composable
fun DashboardScreen(
    api: GuruApi,
    user: UserDto,
    onNavigateOrders: () -> Unit,
    onNavigatePayments: () -> Unit,
    onRecordPayment: (String) -> Unit,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var stats by remember { mutableStateOf<DashboardStatsDto?>(null) }
    var outstanding by remember { mutableStateOf<List<OutstandingDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }

    LaunchedEffect(refreshKey) {
        loading = true
        error = null
        try {
            stats = api.dashboardStats()
            outstanding = api.outstanding().take(5)
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        PageHeader(title = "Dashboard", subtitle = "Overview", onRefresh = { refreshKey++ })
        when {
            loading -> LoadingScreen()
            error != null -> ErrorBanner(error!!, onRetry = { refreshKey++ })
            stats != null -> {
                val s = stats!!
                Column(
                    Modifier
                        .verticalScroll(rememberScrollState())
                        .padding(bottom = GuruSpacing.screenVertical),
                    verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = GuruSpacing.screenHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
                    ) {
                        StatCard("Customers", s.totalCustomers.toString(), Modifier.weight(1f))
                        StatCard("Pending orders", s.pendingOrders.toString(), Modifier.weight(1f), onClick = onNavigateOrders)
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = GuruSpacing.screenHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
                    ) {
                        StatCard("Outstanding", "Rs ${s.totalOutstanding.toLong()}", Modifier.weight(1f), onClick = onNavigatePayments)
                        StatCard("Inactive (30d)", s.inactiveCustomers.toString(), Modifier.weight(1f))
                    }
                    StatCard(
                        "Total orders",
                        s.totalOrders.toString(),
                        Modifier.fillMaxWidth().padding(horizontal = GuruSpacing.screenHorizontal),
                        onClick = onNavigateOrders,
                    )

                    GuruSectionTitle("Top outstanding", modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal))
                    if (outstanding.isEmpty()) {
                        Text(
                            "No outstanding balances",
                            modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        outstanding.forEach { row ->
                            GuruCard {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(GuruSpacing.xs)) {
                                        Text(row.shopName, style = MaterialTheme.typography.titleSmall)
                                        Text(row.name, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
                                        BalanceChip(row.balance.remaining)
                                        if (user.canEdit()) {
                                            GuruOutlinedButton(
                                                text = "Record",
                                                onClick = { onRecordPayment(row.id) },
                                                modifier = Modifier.padding(top = GuruSpacing.sm),
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

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    GuruCard(modifier = modifier, onClick = onClick) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = GuruSpacing.xs))
    }
}
