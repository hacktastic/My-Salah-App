package com.mysalahapp.app;

/** Sizes in dp follow the launcher cell formula 70 * n - 30. */
final class WidgetLayoutSelector {

    enum Layout {
        ROW_NARROW,
        ROW_WIDE,
        SMALL,
        MEDIUM,
    }

    static final float ROW_HEIGHT_DP = 40f;
    static final float SMALL_SIZE_DP = 110f;
    static final float ROW_WIDE_MIN_WIDTH_DP = 180f;
    static final float MEDIUM_MIN_WIDTH_DP = 250f;
    // One row is at most about 80dp on common launchers, and two rows are more than 100dp.
    private static final int TWO_ROWS_MIN_HEIGHT_DP = 90;

    private WidgetLayoutSelector() {}

    static Layout select(int minWidthDp, int minHeightDp) {
        // Old launchers can report 0 before they measure the widget. The default size is 2x2.
        if (minHeightDp <= 0) return Layout.SMALL;

        if (minHeightDp < TWO_ROWS_MIN_HEIGHT_DP) {
            return minWidthDp >= ROW_WIDE_MIN_WIDTH_DP ? Layout.ROW_WIDE : Layout.ROW_NARROW;
        }
        return minWidthDp >= MEDIUM_MIN_WIDTH_DP ? Layout.MEDIUM : Layout.SMALL;
    }
}
