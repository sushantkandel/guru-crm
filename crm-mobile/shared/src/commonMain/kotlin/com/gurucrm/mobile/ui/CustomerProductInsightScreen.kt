package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.data.ProductInsightUpsertRequest
import com.gurucrm.mobile.data.VendorSourceInput
import com.gurucrm.mobile.ui.components.FilterChipRow
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import kotlinx.coroutines.launch

private data class VendorRow(
    val vendorName: String = "",
    val vendorAddress: String = "",
    val vendorPhone: String = "",
    val purchasePrice: String = "",
    val isCurrent: Boolean = true,
)

@Composable
fun CustomerProductInsightScreen(
    api: GuruApi,
    customerId: String,
    initialProductId: String? = null,
    onBack: () -> Unit,
) {
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var selectedProductId by remember { mutableStateOf<String?>(null) }
    var isEditingExisting by remember { mutableStateOf(false) }
    var knowsProduct by remember { mutableStateOf<Boolean?>(null) }
    var isSelling by remember { mutableStateOf<Boolean?>(null) }
    var discontinuedReason by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    val vendors = remember { mutableStateListOf<VendorRow>() }
    val scope = rememberCoroutineScope()

    fun loadInsight(productId: String) {
        scope.launch {
            loading = true
            error = null
            try {
                val insight = api.customerProductInsights(customerId).find { it.productId == productId }
                if (insight != null) {
                    isEditingExisting = true
                    knowsProduct = insight.knowsProduct
                    isSelling = insight.isSelling
                    discontinuedReason = insight.discontinuedReason.orEmpty()
                    notes = insight.notes.orEmpty()
                    vendors.clear()
                    vendors.addAll(
                        insight.vendorSources.map {
                            VendorRow(
                                vendorName = it.vendorName,
                                vendorAddress = it.vendorAddress.orEmpty(),
                                vendorPhone = it.vendorPhone.orEmpty(),
                                purchasePrice = it.purchasePrice?.toString().orEmpty(),
                                isCurrent = it.isCurrent,
                            )
                        },
                    )
                } else {
                    isEditingExisting = false
                    knowsProduct = null
                    isSelling = null
                    discontinuedReason = ""
                    notes = ""
                    vendors.clear()
                }
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loading = true
        try {
            products = api.products(activeOnly = true)
            val preselect = initialProductId?.takeIf { id -> products.any { it.id == id } }
                ?: products.singleOrNull()?.id
            if (preselect != null) {
                selectedProductId = preselect
                loadInsight(preselect)
            } else {
                loading = false
            }
        } catch (e: Exception) {
            error = e.message
            loading = false
        }
    }

    GuruScaffold(
        title = if (isEditingExisting) "Edit field survey" else "Field survey",
        onBack = onBack,
    ) { padding ->
        when {
            loading -> LoadingScreen()
            products.isEmpty() -> Text(
                "Add an active product on the Products screen before recording field surveys.",
                modifier = Modifier.padding(padding).padding(com.gurucrm.mobile.ui.theme.GuruSpacing.screenHorizontal),
            )
            else -> Column(
                Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
            ) {
                GuruFormColumn(scroll = false) {
                    GuruSectionTitle("Product")
                    FilterChipRow(
                        options = products.map { it.id to it.name },
                        selected = selectedProductId.orEmpty(),
                        onSelect = { id ->
                            selectedProductId = id
                            loadInsight(id)
                        },
                    )

                    if (selectedProductId != null) {
                        GuruSectionTitle("Product awareness")
                        FilterChipRow(
                            options = listOf("true" to "Knows product", "false" to "Does not know"),
                            selected = knowsProduct?.toString().orEmpty(),
                            onSelect = { value ->
                                knowsProduct = value == "true"
                                if (knowsProduct == false) {
                                    isSelling = null
                                    discontinuedReason = ""
                                    vendors.clear()
                                }
                            },
                        )

                        if (knowsProduct == true) {
                            GuruSectionTitle("Selling status")
                            FilterChipRow(
                                options = listOf("true" to "Still selling", "false" to "Not selling"),
                                selected = isSelling?.toString().orEmpty(),
                                onSelect = { value ->
                                    isSelling = value == "true"
                                    if (isSelling == true) {
                                        discontinuedReason = ""
                                    }
                                },
                            )
                        }

                        if (knowsProduct == true && isSelling == false) {
                            GuruTextField(
                                value = discontinuedReason,
                                onValueChange = { discontinuedReason = it },
                                label = "Why did they stop selling?",
                            )
                        }

                        if (knowsProduct == true && isSelling != null) {
                            val vendorLabel = if (isSelling == true) "Current vendors" else "Past vendors"
                            GuruSectionTitle(vendorLabel)
                            vendors.forEachIndexed { index, row ->
                                VendorRowFields(
                                    index = index,
                                    row = row,
                                    isCurrent = isSelling == true,
                                    onUpdate = { updated ->
                                        vendors[index] = updated
                                    },
                                    onRemove = { vendors.removeAt(index) },
                                )
                            }
                            GuruOutlinedButton(
                                text = "Add vendor",
                                onClick = {
                                    vendors.add(VendorRow(isCurrent = isSelling == true))
                                },
                                modifier = Modifier.fillMaxWidth(),
                            )
                            if (isSelling == false && vendors.isNotEmpty()) {
                                Text(
                                    "${vendors.size} vendor(s) recorded",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        GuruTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            label = "Notes (optional)",
                        )

                        GuruFormActions {
                            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                            GuruPrimaryButton(
                                text = if (saving) {
                                    "Saving…"
                                } else if (isEditingExisting) {
                                    "Update survey"
                                } else {
                                    "Save survey"
                                },
                                enabled = !saving && knowsProduct != null &&
                                    (knowsProduct == false || isSelling != null) &&
                                    !(knowsProduct == true && isSelling == false && discontinuedReason.isBlank()),
                                onClick = {
                                    val productId = selectedProductId ?: return@GuruPrimaryButton
                                    saving = true
                                    error = null
                                    scope.launch {
                                        try {
                                            api.upsertCustomerProductInsight(
                                                customerId,
                                                productId,
                                                ProductInsightUpsertRequest(
                                                    knowsProduct = knowsProduct == true,
                                                    isSelling = if (knowsProduct == true) isSelling else null,
                                                    discontinuedReason = discontinuedReason.trim().ifBlank { null },
                                                    notes = notes.trim().ifBlank { null },
                                                    vendorSources = vendors.mapIndexed { index, row ->
                                                        VendorSourceInput(
                                                            vendorName = row.vendorName.trim(),
                                                            vendorAddress = row.vendorAddress.trim().ifBlank { null },
                                                            vendorPhone = row.vendorPhone.trim().ifBlank { null },
                                                            purchasePrice = row.purchasePrice.toDoubleOrNull(),
                                                            isCurrent = row.isCurrent,
                                                            sortOrder = index,
                                                        )
                                                    }.filter { it.vendorName.isNotBlank() },
                                                ),
                                            )
                                            onBack()
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
}

@Composable
private fun VendorRowFields(
    index: Int,
    row: VendorRow,
    isCurrent: Boolean,
    onUpdate: (VendorRow) -> Unit,
    onRemove: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = com.gurucrm.mobile.ui.theme.GuruSpacing.xs),
        verticalArrangement = Arrangement.spacedBy(com.gurucrm.mobile.ui.theme.GuruSpacing.sm),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${if (isCurrent) "Vendor" else "Past vendor"} ${index + 1}",
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Remove vendor")
            }
        }
        GuruTextField(
            value = row.vendorName,
            onValueChange = { onUpdate(row.copy(vendorName = it)) },
            label = "Vendor name",
        )
        GuruTextField(
            value = row.vendorAddress,
            onValueChange = { onUpdate(row.copy(vendorAddress = it)) },
            label = "Vendor address",
        )
        GuruTextField(
            value = row.vendorPhone,
            onValueChange = { onUpdate(row.copy(vendorPhone = it)) },
            label = "Contact number",
        )
        GuruTextField(
            value = row.purchasePrice,
            onValueChange = { onUpdate(row.copy(purchasePrice = it)) },
            label = "Purchase price",
        )
    }
}
