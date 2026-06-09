package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CustomerDto
import com.gurucrm.mobile.data.CustomerQuery
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.BalanceChip
import com.gurucrm.mobile.ui.components.EmptyState
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit
import kotlinx.coroutines.delay

@Composable
fun CustomersScreen(
    api: GuruApi,
    user: UserDto,
    onCustomerClick: (String) -> Unit,
    onAddCustomer: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var customers by remember { mutableStateOf<List<CustomerDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }

    LaunchedEffect(search, refreshKey) {
        delay(300)
        loading = true
        error = null
        try {
            customers = api.customers(CustomerQuery(q = search.ifBlank { null }))
        } catch (e: Exception) {
            error = e.message
            customers = emptyList()
        } finally {
            loading = false
        }
    }

    androidx.compose.material3.Scaffold(
        floatingActionButton = {
            if (user.canEdit()) {
                FloatingActionButton(onClick = onAddCustomer) {
                    Icon(Icons.Default.Add, contentDescription = "Add customer")
                }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            PageHeader(title = "Customers", subtitle = "${customers.size} shops", onRefresh = { refreshKey++ })
            GuruTextField(
                value = search,
                onValueChange = { search = it },
                label = "Search name, shop, phone…",
                modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.filterPadding),
            )
            when {
                loading -> LoadingScreen()
                error != null -> ErrorBanner(error!!, onRetry = { refreshKey++ })
                customers.isEmpty() -> EmptyState("No customers found")
                else -> LazyColumn {
                    items(customers, key = { it.id }) { customer ->
                        GuruCard(onClick = { onCustomerClick(customer.id) }) {
                            Text(customer.name, style = MaterialTheme.typography.titleSmall)
                            Text(customer.shopName, style = MaterialTheme.typography.bodyMedium)
                            Text(customer.phone, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            customer.businessStatus?.let { StatusBadge(it, modifier = Modifier.padding(top = GuruSpacing.xs)) }
                            customer.address?.let { addr ->
                                Text(
                                    "${addr.municipality}, W${addr.ward}, ${addr.district}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            if (customer.balance.remaining > 0) {
                                BalanceChip(customer.balance.remaining, modifier = Modifier.padding(top = GuruSpacing.xs))
                            }
                        }
                    }
                }
            }
        }
    }
}
