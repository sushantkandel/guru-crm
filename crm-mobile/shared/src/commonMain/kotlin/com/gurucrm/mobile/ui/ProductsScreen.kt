package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.PaddingValues
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
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.ConfirmDialog
import com.gurucrm.mobile.ui.components.EmptyState
import com.gurucrm.mobile.ui.components.ErrorBanner
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.components.GuruCard
import com.gurucrm.mobile.ui.components.GuruDangerButton
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.PageHeader
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canDelete
import com.gurucrm.mobile.util.canManageProducts
import kotlinx.coroutines.launch

@Composable
fun ProductsScreen(
    api: GuruApi,
    user: UserDto,
    listRefreshKey: Long = 0L,
    onAddProduct: () -> Unit,
    onEditProduct: (String) -> Unit,
) {
    if (!user.canManageProducts()) {
        Column(Modifier.fillMaxSize()) {
            PageHeader(title = "Products", subtitle = "Catalog and default prices")
            EmptyState("You do not have permission to view products.")
        }
        return
    }

    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }
    // Deleting a product is irreversible, so it is confirmed like every other destructive
    // action in the app. A failed delete is shown inline rather than replacing the list.
    var deleteTarget by remember { mutableStateOf<ProductDto?>(null) }
    var deleting by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(refreshKey, listRefreshKey) {
        loading = true
        error = null
        try {
            products = api.products()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    androidx.compose.material3.Scaffold(
        floatingActionButton = {
            if (user.canManageProducts()) {
                FloatingActionButton(onClick = onAddProduct) {
                    Icon(Icons.Default.Add, contentDescription = "Add product")
                }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            PageHeader(
                title = "Products",
                subtitle = "Catalog and default prices",
                onRefresh = { refreshKey++ },
            )
            actionError?.let { ErrorBanner(it, onRetry = { actionError = null }) }
            when {
                loading -> LoadingScreen()
                error != null -> ErrorBanner(error!!, onRetry = { refreshKey++ })
                products.isEmpty() -> EmptyState("No products yet")
                else -> LazyColumn(
                    contentPadding = PaddingValues(bottom = GuruSpacing.fabListInset),
                ) {
                    items(products, key = { it.id }) { product ->
                        GuruCard(onClick = { onEditProduct(product.id) }) {
                            Text(product.name, style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.padding(vertical = GuruSpacing.xs)) {
                                Text(
                                    product.productCode?.takeIf { it.isNotBlank() } ?: "No code",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    " · ${product.defaultUnit.replaceFirstChar { it.uppercase() }}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Row {
                                Text(
                                    "Rs ${product.defaultPrice.toLong()}",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.weight(1f),
                                )
                                StatusBadge(if (product.isActive) "active" else "inactive")
                            }
                            GuruButtonRow {
                                GuruOutlinedButton(text = "Edit", onClick = { onEditProduct(product.id) })
                                if (user.canDelete()) {
                                    GuruDangerButton(
                                        text = "Delete",
                                        onClick = { deleteTarget = product },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    deleteTarget?.let { target ->
        ConfirmDialog(
            title = "Delete product?",
            message = "\"${target.name}\" will be removed from the catalog. This cannot be undone.",
            confirmLabel = "Delete",
            loading = deleting,
            onConfirm = {
                deleting = true
                actionError = null
                scope.launch {
                    try {
                        api.deleteProduct(target.id)
                        deleteTarget = null
                        refreshKey++
                    } catch (e: Exception) {
                        actionError = e.message ?: "Could not delete the product"
                        deleteTarget = null
                    } finally {
                        deleting = false
                    }
                }
            },
            onDismiss = { deleteTarget = null },
        )
    }
}
