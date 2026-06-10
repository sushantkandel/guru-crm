package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
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
import com.gurucrm.mobile.data.ProductUpsertRequest
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canManageProducts
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruPickerField
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import kotlinx.coroutines.launch

private val unitOptions = listOf("packet" to "Packet", "bundle" to "Bundle", "bag" to "Bag")

@Composable
fun ProductFormScreen(
    api: GuruApi,
    user: UserDto,
    productId: String?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    if (!user.canManageProducts()) {
        GuruScaffold(title = "Product", onBack = onBack) {
            Text("You do not have permission to manage products.", Modifier.padding(GuruSpacing.screenHorizontal))
        }
        return
    }

    val isEdit = productId != null
    var loading by remember { mutableStateOf(isEdit) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var productCode by remember { mutableStateOf("") }
    var defaultUnit by remember { mutableStateOf("packet") }
    var defaultPrice by remember { mutableStateOf("") }
    var isActive by remember { mutableStateOf(true) }
    var unitMenuExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(productId) {
        if (!isEdit) return@LaunchedEffect
        loading = true
        try {
            val product = api.product(productId!!)
            name = product.name
            productCode = product.productCode.orEmpty()
            defaultUnit = product.defaultUnit
            defaultPrice = product.defaultPrice.toLong().toString()
            isActive = product.isActive
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    GuruScaffold(title = if (isEdit) "Edit product" else "Add product", onBack = onBack) { padding ->
        when {
            loading -> LoadingScreen()
            else -> Column(
                Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
            ) {
                GuruFormColumn(scroll = false) {
                    GuruTextField(value = name, onValueChange = { name = it }, label = "Product name")
                    GuruTextField(
                        value = productCode,
                        onValueChange = { productCode = it },
                        label = "Product code (optional)",
                    )
                    Column {
                        GuruPickerField(
                            value = unitOptions.firstOrNull { it.first == defaultUnit }?.second ?: defaultUnit,
                            label = "Default unit",
                            placeholder = "Select unit",
                            onOpenPicker = { unitMenuExpanded = true },
                        )
                        DropdownMenu(expanded = unitMenuExpanded, onDismissRequest = { unitMenuExpanded = false }) {
                            unitOptions.forEach { (value, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        defaultUnit = value
                                        unitMenuExpanded = false
                                    },
                                )
                            }
                        }
                    }
                    GuruTextField(
                        value = defaultPrice,
                        onValueChange = { defaultPrice = it.filter { ch -> ch.isDigit() } },
                        label = "Default price (Rs)",
                    )
                    if (isEdit) {
                        androidx.compose.foundation.layout.Row(
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        ) {
                            Text("Active (show in orders)", modifier = Modifier.weight(1f))
                            Switch(checked = isActive, onCheckedChange = { isActive = it })
                        }
                    }
                    GuruFormActions {
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        GuruPrimaryButton(
                            text = if (saving) "Saving…" else if (isEdit) "Save changes" else "Add product",
                            enabled = !saving && name.isNotBlank() && defaultPrice.isNotBlank(),
                            onClick = {
                                saving = true
                                error = null
                                scope.launch {
                                    try {
                                        val price = defaultPrice.toDoubleOrNull() ?: 0.0
                                        val body = ProductUpsertRequest(
                                            name = name.trim(),
                                            productCode = productCode.trim().ifBlank { null },
                                            defaultUnit = defaultUnit,
                                            defaultPrice = price,
                                            isActive = isActive,
                                        )
                                        if (isEdit) {
                                            api.updateProduct(productId!!, body)
                                        } else {
                                            api.createProduct(body)
                                        }
                                        onSaved()
                                    } catch (e: Exception) {
                                        error = e.message
                                    } finally {
                                        saving = false
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}
