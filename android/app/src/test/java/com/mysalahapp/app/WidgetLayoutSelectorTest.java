package com.mysalahapp.app;

import static org.junit.Assert.assertEquals;

import com.mysalahapp.app.WidgetLayoutSelector.Layout;
import org.junit.Test;

public class WidgetLayoutSelectorTest {

    @Test
    public void selectsTheNarrowRowForOneRowAndTwoColumns() {
        assertEquals(Layout.ROW_NARROW, WidgetLayoutSelector.select(110, 40));
    }

    @Test
    public void selectsTheWideRowForOneRowAndThreeOrMoreColumns() {
        assertEquals(Layout.ROW_WIDE, WidgetLayoutSelector.select(180, 40));
        assertEquals(Layout.ROW_WIDE, WidgetLayoutSelector.select(320, 70));
    }

    @Test
    public void selectsTheSmallLayoutForTwoRowsAndFewerThanFourColumns() {
        assertEquals(Layout.SMALL, WidgetLayoutSelector.select(110, 110));
        assertEquals(Layout.SMALL, WidgetLayoutSelector.select(180, 110));
    }

    @Test
    public void selectsTheMediumLayoutForTwoRowsAndFourColumns() {
        assertEquals(Layout.MEDIUM, WidgetLayoutSelector.select(250, 110));
    }

    @Test
    public void selectsTheSmallLayoutWhenTheLauncherReportsNoSize() {
        assertEquals(Layout.SMALL, WidgetLayoutSelector.select(0, 0));
    }
}
