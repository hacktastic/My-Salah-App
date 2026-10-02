package com.mysalahapp.app;

import static org.junit.Assert.assertEquals;

import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;
import org.junit.After;
import org.junit.Test;

public class WidgetScheduleTest {

    private static final TimeZone LOS_ANGELES = TimeZone.getTimeZone("America/Los_Angeles");
    private final Locale originalLocale = Locale.getDefault();

    @After
    public void restoreLocale() {
        Locale.setDefault(originalLocale);
    }

    private static long at(TimeZone zone, int year, int month, int day, int hour, int minute, int second) {
        GregorianCalendar calendar = new GregorianCalendar(zone);
        calendar.clear();
        calendar.set(year, month - 1, day, hour, minute, second);
        return calendar.getTimeInMillis();
    }

    @Test
    public void returnsFiveSecondsAfterTheNextLocalMidnight() {
        long now = at(LOS_ANGELES, 2026, 10, 2, 9, 0, 0);
        assertEquals(at(LOS_ANGELES, 2026, 10, 3, 0, 0, 5), WidgetSchedule.nextMidnight(now, LOS_ANGELES));
    }

    @Test
    public void returnsTheNextDayJustAfterMidnight() {
        long now = at(LOS_ANGELES, 2026, 10, 3, 0, 0, 10);
        assertEquals(at(LOS_ANGELES, 2026, 10, 4, 0, 0, 5), WidgetSchedule.nextMidnight(now, LOS_ANGELES));
    }

    @Test
    public void handlesTheDaylightSavingChange() {
        long now = at(LOS_ANGELES, 2026, 3, 7, 22, 0, 0);
        assertEquals(at(LOS_ANGELES, 2026, 3, 8, 0, 0, 5), WidgetSchedule.nextMidnight(now, LOS_ANGELES));
    }

    @Test
    public void ignoresTheCalendarOfTheDefaultLocale() {
        Locale.setDefault(Locale.forLanguageTag("th-TH-u-ca-buddhist"));
        long now = at(LOS_ANGELES, 2026, 12, 31, 12, 0, 0);
        assertEquals(at(LOS_ANGELES, 2027, 1, 1, 0, 0, 5), WidgetSchedule.nextMidnight(now, LOS_ANGELES));
    }
}
