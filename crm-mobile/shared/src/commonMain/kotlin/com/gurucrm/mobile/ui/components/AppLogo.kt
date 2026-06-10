package com.gurucrm.mobile.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gurucrm.mobile.generated.resources.Res
import com.gurucrm.mobile.generated.resources.logo
import com.gurucrm.mobile.util.APP_NAME
import org.jetbrains.compose.resources.painterResource

@Composable
fun AppLogo(
    modifier: Modifier = Modifier,
    size: Dp = 120.dp,
    crop: Boolean = false,
) {
    Image(
        painter = painterResource(Res.drawable.logo),
        contentDescription = APP_NAME,
        modifier = modifier
            .size(size)
            .then(if (crop) Modifier.clip(RoundedCornerShape(12.dp)) else Modifier),
        contentScale = if (crop) ContentScale.Crop else ContentScale.Fit,
    )
}
