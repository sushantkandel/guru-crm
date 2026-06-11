package com.gurucrm.mobile.data

object CustomerTypes {
    val all = listOf("retailer", "wholesaler", "supplier", "distributor", "dealer")

    fun label(type: String): String = when (type) {
        "retailer" -> "Retailer"
        "wholesaler" -> "Wholesaler"
        "supplier" -> "Supplier"
        "distributor" -> "Distributor"
        "dealer" -> "Dealer"
        else -> type.replaceFirstChar { it.uppercase() }
    }
}
