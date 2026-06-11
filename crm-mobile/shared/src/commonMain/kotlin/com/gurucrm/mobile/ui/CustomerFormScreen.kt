package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CustomerAddressInput
import com.gurucrm.mobile.data.CustomerUpsertRequest
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.ui.components.CustomerTypeChips
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.GuruTextField
import com.gurucrm.mobile.ui.components.LoadingScreen
import kotlinx.coroutines.launch

@Composable
fun CustomerFormScreen(
    api: GuruApi,
    platform: PlatformServices,
    customerId: String?,
    onBack: () -> Unit,
    onSaved: (String) -> Unit,
) {
    val isEdit = customerId != null
    var loading by remember { mutableStateOf(isEdit) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var shopName by remember { mutableStateOf("") }
    var panVat by remember { mutableStateOf("") }
    var customerTypes by remember { mutableStateOf<List<String>>(emptyList()) }
    var street by remember { mutableStateOf("") }
    var location by remember { mutableStateOf(NepalLocationState()) }
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(customerId) {
        if (!isEdit) return@LaunchedEffect
        loading = true
        try {
            val c = api.customer(customerId)
            val addr = c.addresses.firstOrNull()
            name = c.name; phone = c.phone; email = c.email.orEmpty(); shopName = c.shopName
            panVat = c.panVatNumber.orEmpty(); customerTypes = c.customerTypes; street = addr?.street.orEmpty()
            location = NepalLocationState(addr?.province.orEmpty(), addr?.district.orEmpty(), addr?.municipality.orEmpty(), addr?.ward.orEmpty())
            latitude = addr?.latitude; longitude = addr?.longitude
        } catch (e: Exception) { error = e.message }
        finally { loading = false }
    }

    val addressText = listOfNotNull(street.takeIf { it.isNotBlank() }, location.ward.takeIf { it.isNotBlank() }?.let { "Ward $it" },
        location.municipality.takeIf { it.isNotBlank() }, location.district.takeIf { it.isNotBlank() }, location.province.takeIf { it.isNotBlank() }, "Nepal").joinToString(", ")

    GuruScaffold(
        title = if (isEdit) "Edit customer" else "New customer",
        subtitle = "After saving, you can add or update the field survey.",
        onBack = onBack,
    ) { padding ->
        when {
            loading -> LoadingScreen()
            else -> Column(
                Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()),
            ) {
                GuruFormColumn(scroll = false) {
                    GuruTextField(value = name, onValueChange = { name = it }, label = "Customer name")
                    GuruTextField(value = shopName, onValueChange = { shopName = it }, label = "Shop / company name")
                    GuruTextField(value = phone, onValueChange = { phone = it }, label = "Phone")
                    GuruTextField(value = email, onValueChange = { email = it }, label = "Email (optional)")
                    GuruTextField(value = panVat, onValueChange = { panVat = it }, label = "PAN/VAT (optional)")
                    CustomerTypeChips(
                        selected = customerTypes,
                        onChange = { customerTypes = it },
                    )
                    GuruTextField(value = street, onValueChange = { street = it }, label = "Street (optional)")

                    GuruSectionTitle("Address")
                    NepalLocationFields(api, location) { location = it }

                    GuruSectionTitle("Shop location")
                    MapPicker(latitude, longitude, shopName, addressText, api, platform, { lat, lng -> latitude = lat; longitude = lng })

                    GuruFormActions {
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        GuruPrimaryButton(
                            text = if (saving) "Saving…" else if (isEdit) "Save changes" else "Create customer",
                            enabled = !saving && name.isNotBlank() && shopName.isNotBlank() && phone.isNotBlank() &&
                                location.province.isNotBlank() && location.district.isNotBlank() &&
                                location.municipality.isNotBlank() && location.ward.isNotBlank(),
                            onClick = {
                                saving = true; error = null
                                scope.launch {
                                    try {
                                        val payload = CustomerUpsertRequest(
                                            name = name.trim(), phone = phone.trim(), email = email.trim().ifBlank { null },
                                            shopName = shopName.trim(), panVatNumber = panVat.trim().ifBlank { null },
                                            customerTypes = customerTypes,
                                            address = CustomerAddressInput(location.province, location.district, location.municipality, location.ward,
                                                street.trim().ifBlank { null }, latitude, longitude),
                                        )
                                        val savedId = if (isEdit) {
                                            api.updateCustomer(customerId, payload)
                                            customerId
                                        } else {
                                            api.createCustomer(payload)
                                        }
                                        onSaved(savedId)
                                    } catch (e: Exception) { error = e.message }
                                    finally { saving = false }
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
