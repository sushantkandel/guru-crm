package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.CompanyAddressInput
import com.gurucrm.mobile.data.RegisterCompanyRequest
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.ui.components.GuruFormActions
import com.gurucrm.mobile.ui.components.GuruFormColumn
import com.gurucrm.mobile.ui.components.GuruPasswordField
import com.gurucrm.mobile.ui.components.GuruPrimaryButton
import com.gurucrm.mobile.ui.components.GuruScaffold
import com.gurucrm.mobile.ui.components.GuruSectionTitle
import com.gurucrm.mobile.ui.components.GuruTextField
import kotlinx.coroutines.launch

@Composable
fun RegisterCompanyScreen(
    api: GuruApi,
    initialEmail: String = "",
    initialOwnerName: String = "",
    fromAuth: Boolean = false,
    onBack: () -> Unit,
    onRegistered: (UserDto) -> Unit,
) {
    var companyName by remember { mutableStateOf("") }
    var ownerName by remember(initialOwnerName) { mutableStateOf(initialOwnerName) }
    var email by remember(initialEmail) { mutableStateOf(initialEmail) }
    var password by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var street by remember { mutableStateOf("") }
    var location by remember { mutableStateOf(NepalLocationState()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val canSubmit = companyName.isNotBlank() &&
        ownerName.isNotBlank() &&
        email.isNotBlank() &&
        password.length >= 6 &&
        location.province.isNotBlank() &&
        location.district.isNotBlank() &&
        location.municipality.isNotBlank() &&
        street.isNotBlank()

    GuruScaffold(title = "Register", onBack = onBack) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            GuruFormColumn(scroll = false) {
                if (fromAuth) {
                    Text(
                        "No account found — complete registration to continue.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                Text(
                    "Register as company owner. You will manage staff, customers, products, and permissions.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                GuruTextField(
                    value = companyName,
                    onValueChange = { companyName = it },
                    label = "Company name",
                )

                GuruSectionTitle("Address")
                GuruTextField(
                    value = street,
                    onValueChange = { street = it },
                    label = "Street name",
                )
                NepalLocationFields(api, location, includeWard = false) { location = it }

                GuruSectionTitle("Owner account")
                GuruTextField(
                    value = ownerName,
                    onValueChange = { ownerName = it },
                    label = "Your name",
                )
                GuruTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Email",
                )
                GuruPasswordField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Password",
                )
                GuruTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = "Company phone (optional)",
                )

                GuruFormActions {
                    error?.let {
                        Text(it, color = MaterialTheme.colorScheme.error)
                    }
                    GuruPrimaryButton(
                        text = if (saving) "Registering…" else "Register & sign in",
                        enabled = !saving && canSubmit,
                        onClick = {
                            saving = true
                            error = null
                            scope.launch {
                                try {
                                    val auth = api.registerCompany(
                                        RegisterCompanyRequest(
                                            companyName = companyName.trim(),
                                            ownerName = ownerName.trim(),
                                            email = email.trim(),
                                            password = password,
                                            phone = phone.trim(),
                                            address = CompanyAddressInput(
                                                province = location.province,
                                                district = location.district,
                                                municipality = location.municipality,
                                                street = street.trim(),
                                            ),
                                        ),
                                    )
                                    onRegistered(auth.user)
                                } catch (e: Exception) {
                                    error = e.message ?: "Registration failed"
                                } finally {
                                    saving = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    TextButton(
                        onClick = onBack,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "Already have an account? Sign in",
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}
