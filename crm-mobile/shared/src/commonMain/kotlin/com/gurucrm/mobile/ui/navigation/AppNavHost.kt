package com.gurucrm.mobile.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.gurucrm.mobile.api.GuruApi
import com.gurucrm.mobile.data.UserDto
import com.gurucrm.mobile.platform.BackupFileService
import com.gurucrm.mobile.platform.PlatformServices
import com.gurucrm.mobile.ui.components.AppLogo
import com.gurucrm.mobile.ui.BackupRestoreScreen
import com.gurucrm.mobile.ui.CustomerDetailScreen
import com.gurucrm.mobile.ui.CustomerFormScreen
import com.gurucrm.mobile.ui.CustomersScreen
import com.gurucrm.mobile.ui.DashboardScreen
import com.gurucrm.mobile.ui.MapScreen
import com.gurucrm.mobile.ui.OrderDetailScreen
import com.gurucrm.mobile.ui.OrderFormScreen
import com.gurucrm.mobile.ui.OrdersScreen
import com.gurucrm.mobile.ui.PaymentFormScreen
import com.gurucrm.mobile.ui.PaymentsScreen
import com.gurucrm.mobile.ui.ProductFormScreen
import com.gurucrm.mobile.ui.ProductsScreen
import com.gurucrm.mobile.ui.SettingsScreen
import com.gurucrm.mobile.util.canManageProducts
import com.gurucrm.mobile.util.APP_NAME
import com.gurucrm.mobile.util.isOwner

private fun visibleTabsFor(user: UserDto): List<TabRoute> = buildList {
    add(TabRoute.Dashboard)
    add(TabRoute.Customers)
    add(TabRoute.Orders)
    if (user.canManageProducts()) add(TabRoute.Products)
    add(TabRoute.Payments)
    add(TabRoute.Map)
}

private sealed class TabRoute(val route: String, val label: String) {
    data object Dashboard : TabRoute("tab/dashboard", "Dashboard")
    data object Customers : TabRoute("tab/customers", "Customers")
    data object Orders : TabRoute("tab/orders", "Orders")
    data object Products : TabRoute("tab/products", "Products")
    data object Payments : TabRoute("tab/payments", "Payments")
    data object Map : TabRoute("tab/map", "Map")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavHost(
    api: GuruApi,
    platform: PlatformServices,
    backupFiles: BackupFileService,
    user: UserDto,
    onLogout: () -> Unit,
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute?.startsWith("tab/") == true

    Scaffold(
        topBar = {
            if (showBottomBar) {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            AppLogo(size = 32.dp)
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text(APP_NAME, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    user.companyName.ifBlank { user.name },
                                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    },
                    actions = {
                        if (user.isOwner()) {
                            IconButton(onClick = { navController.navigate("settings") }) {
                                Icon(Icons.Default.Settings, contentDescription = "Settings")
                            }
                        }
                        TextButton(onClick = { api.logout(); onLogout() }) { Text("Logout") }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface,
                    ),
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    visibleTabsFor(user).forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(TabRoute.Dashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    when (tab) {
                                        TabRoute.Dashboard -> Icons.Default.Dashboard
                                        TabRoute.Customers -> Icons.Default.People
                                        TabRoute.Orders -> Icons.Default.ShoppingCart
                                        TabRoute.Products -> Icons.Default.Category
                                        TabRoute.Payments -> Icons.Default.Payment
                                        TabRoute.Map -> Icons.Default.Map
                                    },
                                    contentDescription = tab.label,
                                )
                            },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.background,
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TabRoute.Dashboard.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(TabRoute.Dashboard.route) {
                DashboardScreen(
                    api = api,
                    user = user,
                    onNavigateOrders = { navController.navigate(TabRoute.Orders.route) },
                    onNavigatePayments = { navController.navigate(TabRoute.Payments.route) },
                    onRecordPayment = { customerId ->
                        navController.navigate("payments/new?customerId=$customerId")
                    },
                )
            }
            composable(TabRoute.Customers.route) {
                CustomersScreen(
                    api = api,
                    user = user,
                    onCustomerClick = { navController.navigate("customers/$it") },
                    onAddCustomer = { navController.navigate("customers/new") },
                )
            }
            composable(TabRoute.Orders.route) {
                OrdersScreen(
                    api = api,
                    user = user,
                    onOrderClick = { navController.navigate("orders/$it") },
                    onNewOrder = { customerId ->
                        val route = if (customerId != null) "orders/new?customerId=$customerId" else "orders/new"
                        navController.navigate(route)
                    },
                )
            }
            if (user.canManageProducts()) {
                composable(TabRoute.Products.route) {
                    ProductsScreen(
                        api = api,
                        user = user,
                        onAddProduct = { navController.navigate("products/new") },
                        onEditProduct = { navController.navigate("products/edit/$it") },
                    )
                }
            }
            composable(TabRoute.Payments.route) {
                PaymentsScreen(
                    api = api,
                    user = user,
                    onRecordPayment = { customerId ->
                        navController.navigate("payments/new?customerId=$customerId")
                    },
                    onEditPayment = { navController.navigate("payments/edit/$it") },
                )
            }
            composable(TabRoute.Map.route) {
                MapScreen(
                    api = api,
                    platform = platform,
                    onCustomerClick = { navController.navigate("customers/$it") },
                )
            }

            composable("customers/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                CustomerDetailScreen(
                    api = api,
                    platform = platform,
                    user = user,
                    customerId = id,
                    onBack = { navController.popBackStack() },
                    onEdit = { navController.navigate("customers/edit/$id") },
                    onNewOrder = { navController.navigate("orders/new?customerId=$id") },
                    onRecordPayment = { navController.navigate("payments/new?customerId=$id") },
                    onOrderClick = { navController.navigate("orders/$it") },
                )
            }
            composable("customers/new") {
                CustomerFormScreen(
                    api = api,
                    platform = platform,
                    customerId = null,
                    onBack = { navController.popBackStack() },
                    onSaved = { id ->
                        navController.popBackStack()
                        navController.navigate("customers/$id")
                    },
                )
            }
            composable("customers/edit/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                CustomerFormScreen(
                    api = api,
                    platform = platform,
                    customerId = id,
                    onBack = { navController.popBackStack() },
                    onSaved = {
                        navController.popBackStack()
                        navController.navigate("customers/$id")
                    },
                )
            }

            composable(
                route = "orders/new?customerId={customerId}",
                arguments = listOf(navArgument("customerId") { type = NavType.StringType; defaultValue = "" }),
            ) { entry ->
                val customerId = entry.arguments?.getString("customerId").orEmpty().ifBlank { null }
                OrderFormScreen(
                    api = api,
                    user = user,
                    orderId = null,
                    initialCustomerId = customerId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() },
                )
            }
            composable("orders/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                OrderDetailScreen(
                    api = api,
                    user = user,
                    orderId = id,
                    onBack = { navController.popBackStack() },
                    onEdit = { navController.navigate("orders/edit/$id") },
                    onCustomerClick = { navController.navigate("customers/$it") },
                )
            }
            composable("orders/edit/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                OrderFormScreen(
                    api = api,
                    user = user,
                    orderId = id,
                    initialCustomerId = null,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() },
                )
            }

            if (user.canManageProducts()) {
                composable("products/new") {
                    ProductFormScreen(
                        api = api,
                        user = user,
                        productId = null,
                        onBack = { navController.popBackStack() },
                        onSaved = { navController.popBackStack() },
                    )
                }
                composable("products/edit/{id}") { entry ->
                    val id = entry.arguments?.getString("id") ?: return@composable
                    ProductFormScreen(
                        api = api,
                        user = user,
                        productId = id,
                        onBack = { navController.popBackStack() },
                        onSaved = { navController.popBackStack() },
                    )
                }
            }

            composable(
                route = "payments/new?customerId={customerId}",
                arguments = listOf(navArgument("customerId") { type = NavType.StringType; defaultValue = "" }),
            ) { entry ->
                val customerId = entry.arguments?.getString("customerId").orEmpty().ifBlank { null }
                PaymentFormScreen(
                    api = api,
                    user = user,
                    paymentId = null,
                    initialCustomerId = customerId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() },
                )
            }
            composable("payments/edit/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                PaymentFormScreen(
                    api = api,
                    user = user,
                    paymentId = id,
                    initialCustomerId = null,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() },
                )
            }

            composable("settings") {
                SettingsScreen(
                    user = user,
                    onBack = { navController.popBackStack() },
                    onBackupRestore = { navController.navigate("settings/backup") },
                )
            }
            composable("settings/backup") {
                BackupRestoreScreen(
                    api = api,
                    backupFiles = backupFiles,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
