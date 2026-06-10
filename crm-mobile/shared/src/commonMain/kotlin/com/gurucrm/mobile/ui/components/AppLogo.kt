package com.gurucrm.mobile.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.generated.resources.Res
import com.gurucrm.mobile.generated.resources.logo
import com.gurucrm.mobile.util.APP_NAME
import org.jetbrains.compose.resources.painterResource

@Composable
fun AppLogo(modifier: Modifier = Modifier, size: Dp = 120.dp) {
    Image(
        painter = painterResource(Res.drawable.logo),
        contentDescription = APP_NAME,
        modifier = modifier.size(size),
        contentScale = ContentScale.Fit,
    )
}
