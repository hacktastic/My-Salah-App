package com.mysalahapp.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class WidgetTextTest {

    private static final String[] NAMES = { "Fajr", "Dhuhr", "Asar", "Maghrib", "Isha" };

    @Test
    public void describesTheStreakAndEverySalah() {
        String[] statuses = { "group", "male-alone", "late", "", "excused" };
        assertEquals(
            "3 day streak. Fajr: In Jamaah. Dhuhr: On Time. Asr: Late. Maghrib: Not logged. Isha: Excused.",
            WidgetText.describe(3, NAMES, statuses)
        );
    }

    @Test
    public void usesTheAppLabelsForEveryStatus() {
        assertEquals("Prayed", WidgetText.statusLabel("female-alone"));
        assertEquals("Missed", WidgetText.statusLabel("missed"));
        assertEquals("—", WidgetText.statusLabel(""));
    }

    @Test
    public void showsAsrForTheStoredNameAsar() {
        assertEquals("Asr", WidgetText.displayName("Asar"));
        assertEquals("Isha", WidgetText.displayName("Isha"));
    }
}
