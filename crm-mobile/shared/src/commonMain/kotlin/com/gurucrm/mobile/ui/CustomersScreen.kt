package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import com.gurucrm.mobile.data.CustomerTypes
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.BalanceChip
import com.gurucrm.mobile.ui.components.EmptyState
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.FilterChipRow
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
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
    var showFilters by remember { mutableStateOf(false) }
    var customerType by remember { mutableStateOf("") }
    var productId by remember { mutableStateOf("") }
    var knowsProduct by remember { mutableStateOf("") }
    var isSelling by remember { mutableStateOf("") }
    var vendor by remember { mutableStateOf("") }
    var vendorCurrentOnly by remember { mutableStateOf(false) }
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var customers by remember { mutableStateOf<List<CustomerDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        runCatching { products = api.products(activeOnly = true) }
    }

    LaunchedEffect(search, customerType, productId, knowsProduct, isSelling, vendor, vendorCurrentOnly, refreshKey) {
        delay(300)
        loading = true
        error = null
        try {
            customers = api.customers(
                CustomerQuery(
                    q = search.ifBlank { null },
                    customerType = customerType.ifBlank { null },
                    productId = productId.ifBlank { null },
                    knowsProduct = knowsProduct.ifBlank { null },
                    isSelling = isSelling.ifBlank { null },
                    vendor = vendor.ifBlank { null },
                    vendorCurrentOnly = if (vendorCurrentOnly) "true" else null,
                ),
            )
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
            GuruOutlinedButton(
                text = if (showFilters) "Hide filters" else "Show filters",
                onClick = { showFilters = !showFilters },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = GuruSpacing.screenHorizontal)
                    .padding(bottom = GuruSpacing.sm),
            )
            if (showFilters) {
                FilterChipRow(
                    options = listOf("" to "All types") + CustomerTypes.all.map { it to CustomerTypes.label(it) },
                    selected = customerType,
                    onSelect = { customerType = it },
                    inset = true,
                )
                if (products.isNotEmpty()) {
                    FilterChipRow(
                        options = listOf("" to "All products") + products.map { it.id to it.name },
                        selected = productId,
                        onSelect = { productId = it },
                        inset = true,
                    )
                }
                if (productId.isNotBlank()) {
                    FilterChipRow(
                        options = listOf("" to "Knows: any", "true" to "Knows product", "false" to "Unknown"),
                        selected = knowsProduct,
                        onSelect = { knowsProduct = it },
                        inset = true,
                    )
                    FilterChipRow(
                        options = listOf("" to "Selling: any", "true" to "Still selling", "false" to "Not selling"),
                        selected = isSelling,
                        onSelect = { isSelling = it },
                        inset = true,
                    )
                }
                GuruTextField(
                    value = vendor,
                    onValueChange = { vendor = it },
                    label = "Vendor name",
                    modifier = Modifier.padding(horizontal = GuruSpacing.screenHorizontal, vertical = GuruSpacing.sm),
                )
                FilterChipRow(
                    options = listOf("false" to "All vendor sources", "true" to "Current vendors only"),
                    selected = vendorCurrentOnly.toString(),
                    onSelect = { vendorCurrentOnly = it == "true" },
                    inset = true,
                )
            }
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
                            if (customer.customerTypes.isNotEmpty()) {
                                Text(
                                    customer.customerTypes.joinToString(", ") { CustomerTypes.label(it) },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
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
