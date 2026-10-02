package com.mysalahapp.app;

final class WidgetText {

    private WidgetText() {}

    // Copied from the labels in src/components/BottomSheets/BottomSheetSingleDateView.tsx.
    static String statusLabel(String status) {
        switch (status) {
            case "group":
                return "In Jamaah";
            case "male-alone":
                return "On Time";
            case "female-alone":
                return "Prayed";
            case "late":
                return "Late";
            case "missed":
                return "Missed";
            case "excused":
                return "Excused";
            default:
                return "—";
        }
    }

    // The stored key is "Asar"; the app shows "Asr" (SalahTable.tsx).
    static String displayName(String name) {
        return name.equals("Asar") ? "Asr" : name;
    }

    /** The text that screen readers read for the whole widget. */
    static String describe(int streak, String[] names, String[] statuses) {
        StringBuilder text = new StringBuilder().append(streak).append(" day streak.");
        for (int i = 0; i < names.length; i++) {
            String status = i < statuses.length ? statuses[i] : "";
            text
                .append(' ')
                .append(displayName(names[i]))
                .append(": ")
                .append(status.isEmpty() ? "Not logged" : statusLabel(status))
                .append('.');
        }
        return text.toString();
    }
}
