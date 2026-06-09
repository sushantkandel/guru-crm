package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.data.ProductDto
import com.gurucrm.mobile.ui.components.GuruPickerField

data class ProductSelection(
    val productId: String?,
    val productName: String,
    val unit: String,
    val unitPrice: Double,
)

@Composable
fun ProductSelect(
    products: List<ProductDto>,
    selectedName: String,
    onSelect: (ProductSelection) -> Unit,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        GuruPickerField(
            value = selectedName,
            label = "Product",
            placeholder = "Select product",
            enabled = enabled,
            onOpenPicker = { expanded = true },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            products.forEach { product ->
                DropdownMenuItem(
                    text = { Text("${product.name} — Rs ${product.defaultPrice.toLong()}") },
                    onClick = {
                        onSelect(
                            ProductSelection(
                                productId = product.id,
                                productName = product.name,
                                unit = product.defaultUnit,
                                unitPrice = product.defaultPrice,
                            ),
                        )
                        expanded = false
                    },
                )
            }
        }
    }
}
