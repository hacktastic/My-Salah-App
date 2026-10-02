package com.mysalahapp.app;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;

final class WidgetSchedule {

    private WidgetSchedule() {}

    /** Five seconds after the next local midnight, so the new day has started when the refresh runs. */
    static long nextMidnight(long nowMillis, TimeZone zone) {
        // Calendar.getInstance() follows the default locale, for example the Buddhist calendar in th_TH.
        GregorianCalendar next = new GregorianCalendar(zone);
        next.setTimeInMillis(nowMillis);
        next.add(Calendar.DAY_OF_MONTH, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        return next.getTimeInMillis();
    }
}
