package com.gurucrm.mobile.ui.theme

import androidx.compose.ui.unit.dp

/**
 * Sales Guru spacing scale — Material Design 3 eight-point grid.
 *
 * xs/sm: related elements in a row or dense groups
 * md: standard field gap, screen horizontal padding, card padding
 * lg: section separation, space before primary actions, auth screens
 * xl/xxl: major layout rhythm (hero headers)
 */
object GuruSpacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
    val xxl = 48.dp

    /** Vertical gap between stacked form fields. */
    val fieldGap = md

    /** Gap between unrelated form sections. */
    val sectionGap = lg

    /** Space above primary call-to-action buttons. */
    val actionGap = lg

    /** Standard horizontal screen / content padding. */
    val screenHorizontal = md

    /** Standard vertical content padding inside scrollable screens. */
    val screenVertical = md

    /** Auth and marketing-style screens (login). */
    val authPadding = lg

    /** Inner padding for cards and surfaces. */
    val cardPadding = md

    /** Vertical margin between stacked cards in lists. */
    val cardOuterVertical = sm

    /** Gap between buttons in a horizontal row. */
    val buttonRowGap = sm

    /** Gap between side-by-side fields in a row. */
    val fieldRowGap = sm

    /** Page header vertical padding. */
    val headerVertical = md

    /** Filter / chip row padding. */
    val filterPadding = sm

    /** List item vertical padding inside detail screens. */
    val listItemVertical = sm

    /**
     * Bottom inset for scrollable lists on screens with a floating action button.
     * FAB (56dp) + its 16dp margin + 16dp breathing room, so the last row's actions
     * are never trapped underneath it.
     */
    val fabListInset = 88.dp

    /** Icon size inside the bottom navigation bar (Material 3 standard). */
    val navIcon = lg

    /** Height of the bottom navigation bar. */
    val navBarHeight = 64.dp
}
