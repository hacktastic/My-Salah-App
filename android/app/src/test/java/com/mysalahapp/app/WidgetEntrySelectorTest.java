package com.mysalahapp.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class WidgetEntrySelectorTest {

    private static final String[] DATES = { "2026-10-10", "2026-10-11", "2026-10-12" };

    @Test
    public void selectsTodayWhenTodayHasAnEntry() {
        assertEquals(0, WidgetEntrySelector.select(DATES, "2026-10-10"));
        assertEquals(1, WidgetEntrySelector.select(DATES, "2026-10-11"));
    }

    @Test
    public void selectsTheLastEntryAfterAllEntries() {
        assertEquals(2, WidgetEntrySelector.select(DATES, "2026-11-01"));
    }

    @Test
    public void returnsMinusOneBeforeTheFirstEntry() {
        assertEquals(-1, WidgetEntrySelector.select(DATES, "2026-10-09"));
    }

    @Test
    public void returnsMinusOneWithNoEntries() {
        assertEquals(-1, WidgetEntrySelector.select(new String[0], "2026-10-10"));
    }

    @Test
    public void doesNotDependOnTheEntryOrder() {
        String[] unordered = { "2026-10-12", "2026-10-10", "2026-10-11" };
        assertEquals(2, WidgetEntrySelector.select(unordered, "2026-10-11"));
    }
}
