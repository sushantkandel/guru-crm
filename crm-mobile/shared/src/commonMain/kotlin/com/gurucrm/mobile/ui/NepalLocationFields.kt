package com.gurucrm.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.ui.components.GuruFieldRow
import com.gurucrm.mobile.ui.components.GuruPickerField
import com.gurucrm.mobile.ui.theme.GuruSpacing

data class NepalLocationState(
    val province: String = "",
    val district: String = "",
    val municipality: String = "",
    val ward: String = "",
)

@Composable
fun NepalLocationFields(
    api: GuruApi,
    value: NepalLocationState,
    includeWard: Boolean = true,
    onChange: (NepalLocationState) -> Unit,
) {
    var provinces by remember { mutableStateOf<List<String>>(emptyList()) }
    var districts by remember { mutableStateOf<List<String>>(emptyList()) }
    var municipalities by remember { mutableStateOf<List<String>>(emptyList()) }
    var wards by remember { mutableStateOf<List<String>>(emptyList()) }

    LaunchedEffect(Unit) { runCatching { provinces = api.nepalProvinces() } }
    LaunchedEffect(value.province) {
        districts = emptyList(); municipalities = emptyList(); wards = emptyList()
        if (value.province.isNotBlank()) runCatching { districts = api.nepalDistricts(value.province) }
    }
    LaunchedEffect(value.province, value.district) {
        municipalities = emptyList(); wards = emptyList()
        if (value.province.isNotBlank() && value.district.isNotBlank()) {
            runCatching { municipalities = api.nepalMunicipalities(value.province, value.district) }
        }
    }
    LaunchedEffect(value.province, value.district, value.municipality, includeWard) {
        wards = emptyList()
        if (includeWard && value.municipality.isNotBlank()) {
            runCatching { wards = api.nepalWards(value.province, value.district, value.municipality) }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(GuruSpacing.fieldGap)) {
        LocationDropdown(
            label = "Province",
            value = value.province,
            options = provinces,
            onSelect = { onChange(value.copy(province = it, district = "", municipality = "", ward = "")) },
        )
        GuruFieldRow {
            LocationDropdown(
                label = "District",
                value = value.district,
                options = districts,
                enabled = value.province.isNotBlank(),
                modifier = Modifier.weight(1f),
                onSelect = { onChange(value.copy(district = it, municipality = "", ward = "")) },
            )
            LocationDropdown(
                label = "Municipality",
                value = value.municipality,
                options = municipalities,
                enabled = value.district.isNotBlank(),
                modifier = Modifier.weight(1f),
                onSelect = { onChange(value.copy(municipality = it, ward = "")) },
            )
        }
        if (includeWard) {
            LocationDropdown(
                label = "Ward",
                value = value.ward,
                options = wards,
                enabled = value.municipality.isNotBlank(),
                onSelect = { onChange(value.copy(ward = it)) },
            )
        }
    }
}

@Composable
private fun LocationDropdown(
    label: String,
    value: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier) {
        GuruPickerField(
            value = value,
            label = label,
            placeholder = "Select $label",
            enabled = enabled,
            onOpenPicker = { expanded = true },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelect(option); expanded = false })
            }
        }
    }
}
