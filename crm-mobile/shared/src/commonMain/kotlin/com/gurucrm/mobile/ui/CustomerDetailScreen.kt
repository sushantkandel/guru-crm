package com.gurucrm.mobile.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CustomerDetailDto
import com.gurucrm.mobile.data.CustomerProductInsightDto
import com.gurucrm.mobile.data.CustomerTypes
import com.gurucrm.mobile.data.MapMarker
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.platform.OsmMapView
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.ui.components.BalanceChip
import com.gurucrm.mobile.ui.components.GuruButtonRow
import com.gurucrm.mobile.ui.components.GuruOutlinedButton
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.LoadingScreen
import com.gurucrm.mobile.ui.components.StatusBadge
import com.gurucrm.mobile.ui.theme.GuruSpacing
import com.gurucrm.mobile.util.canEdit
import com.gurucrm.mobile.util.googleMapsDirectionsUrl
import com.gurucrm.mobile.util.resolveShopCoords
import kotlinx.coroutines.launch

@Composable
fun CustomerDetailScreen(
    api: GuruApi,
    platform: PlatformServices,
    user: UserDto,
    customerId: String,
    onBack: () -> Unit,
    onEdit: () -> Unit = {},
    onNewOrder: () -> Unit = {},
    onRecordPayment: () -> Unit = {},
    onOrderClick: (String) -> Unit = {},
    onFieldSurvey: () -> Unit = {},
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var customer by remember { mutableStateOf<CustomerDetailDto?>(null) }
    var insights by remember { mutableStateOf<List<CustomerProductInsightDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(customerId) {
        loading = true
        error = null
        try {
            customer = api.customer(customerId)
            insights = api.customerProductInsights(customerId)
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val c = customer
    GuruScaffold(
        title = c?.shopName ?: "Customer",
        subtitle = c?.name,
        onBack = onBack,
        actions = {
            if (c != null && user.canEdit()) {
                GuruOutlinedButton(text = "Edit", onClick = onEdit)
            }
        },
    ) { padding ->
        when {
            loading -> LoadingScreen()
            error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(GuruSpacing.screenHorizontal))
            c != null -> {
                val addr = c.addresses.firstOrNull()
                val coords = resolveShopCoords(addr?.latitude, addr?.longitude)
                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(GuruSpacing.screenHorizontal, GuruSpacing.screenVertical),
                    verticalArrangement = Arrangement.spacedBy(GuruSpacing.sm),
                ) {
                    Text(c.phone, style = MaterialTheme.typography.bodyMedium)
                    c.businessStatus?.let { StatusBadge(it) }
                    if (c.customerTypes.isNotEmpty()) {
                        Text(
                            c.customerTypes.joinToString(", ") { CustomerTypes.label(it) },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (user.canEdit()) {
                        GuruOutlinedButton(
                            text = "Field survey",
                            onClick = onFieldSurvey,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    if (insights.isNotEmpty()) {
                        GuruSectionTitle("Field intelligence")
                        insights.forEach { insight ->
                            val productName = insight.product?.name ?: "Product"
                            val status = when {
                                !insight.knowsProduct -> "Does not know product"
                                insight.isSelling == true -> "Still selling"
                                insight.isSelling == false -> "Not selling"
                                else -> "Surveyed"
                            }
                            Text("$productName — $status", style = MaterialTheme.typography.bodyMedium)
                            insight.vendorSources.forEach { vendor ->
                                val price = vendor.purchasePrice?.let { " @ $it" }.orEmpty()
                                val contact = vendor.vendorPhone?.let { " · $it" }.orEmpty()
                                Text(
                                    "• ${vendor.vendorName}$price$contact",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                vendor.vendorAddress?.takeIf { it.isNotBlank() }?.let { address ->
                                    Text(
                                        "  $address",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                    if (addr != null) {
                        Text(
                            "${addr.municipality}, Ward ${addr.ward}, ${addr.district}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    if (user.canEdit()) {
                        GuruButtonRow {
                            GuruPrimaryButton(text = "New order", onClick = onNewOrder)
                            GuruOutlinedButton(text = "Record payment", onClick = onRecordPayment)
                        }
                    }

                    GuruSectionTitle("Balance")
                    BalanceChip(c.balance.remaining)

                    if (coords != null) {
                        GuruSectionTitle("Location")
                        OsmMapView(
                            center = coords,
                            zoom = 16,
                            markers = listOf(
                                MapMarker(c.id, coords.lat, coords.lng, c.shopName, addr?.municipality ?: ""),
                            ),
                            routeGeoJson = null,
                            deviceLocation = null,
                            onMapClick = null,
                            modifier = Modifier.fillMaxWidth().height(200.dp),
                        )
                        GuruOutlinedButton(
                            text = "Get Directions",
                            onClick = {
                                scope.launch {
                                    val origin = platform.getCurrentLocation()
                                    platform.openUrl(googleMapsDirectionsUrl(coords.lat, coords.lng, c.shopName, origin))
                                }
                            },
                        )
                    }

                    GuruSectionTitle("Orders (${c.orders.size})")
                    c.orders.take(15).forEach { order ->
                        Row(
                            Modifier.fillMaxWidth().clickable { onOrderClick(order.id) }.padding(vertical = GuruSpacing.listItemVertical),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(GuruSpacing.xs)) {
                                Text(order.orderDate.take(10), style = MaterialTheme.typography.bodyMedium)
                                StatusBadge(order.status)
                            }
                            Text("Rs ${order.totalAmount.toLong()}", style = MaterialTheme.typography.titleSmall)
                        }
                    }

                    GuruSectionTitle("Payments (${c.payments.size})")
                    c.payments.take(15).forEach { payment ->
                        Text(
                            "${payment.paymentDate.take(10)} · ${payment.paymentType} · Rs ${payment.amount.toLong()}",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(vertical = GuruSpacing.listItemVertical),
                        )
                    }
                }
            }
        }
    }
}
