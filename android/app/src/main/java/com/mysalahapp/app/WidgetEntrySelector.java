package com.mysalahapp.app;

final class WidgetEntrySelector {

    private WidgetEntrySelector() {}

    /** Dates are "yyyy-MM-dd", so string order is date order. Returns -1 when no date is on or before today. */
    static int select(String[] dates, String today) {
        int best = -1;
        for (int i = 0; i < dates.length; i++) {
            if (dates[i].compareTo(today) <= 0 && (best == -1 || dates[i].compareTo(dates[best]) > 0)) {
                best = i;
            }
        }
        return best;
    }
}
