package com.mysalahapp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;
import androidx.annotation.Nullable;
import com.mysalahapp.app.WidgetLayoutSelector.Layout;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SalahStreakWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "SalahStreakWidget";
    private static final String ACTION_MIDNIGHT = "com.mysalahapp.app.action.WIDGET_MIDNIGHT";
    private static final int SUPPORTED_VERSION = 1;
    private static final int BROKEN_COUNT_COLOR = 0xFF8E8E93;
    private static final long MIDNIGHT_WINDOW_MILLIS = 15 * 60 * 1000L;

    private static final int[] DOT_IDS = { R.id.dot_0, R.id.dot_1, R.id.dot_2, R.id.dot_3, R.id.dot_4 };
    private static final int[] HALO_IDS = { R.id.halo_0, R.id.halo_1, R.id.halo_2, R.id.halo_3, R.id.halo_4 };
    private static final int[] LABEL_IDS = { R.id.label_0, R.id.label_1, R.id.label_2, R.id.label_3, R.id.label_4 };

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, SalahStreakWidgetProvider.class));
        if (ids.length == 0) return;

        for (int id : ids) {
            updateWidget(context, manager, id);
        }
        scheduleMidnightRefresh(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
        scheduleMidnightRefresh(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        updateWidget(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (
            ACTION_MIDNIGHT.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_BOOT_COMPLETED.equals(action)
        ) {
            refreshAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager != null) {
            alarmManager.cancel(midnightIntent(context));
        }
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        JSONObject entry = readEntry(context, today());
        RemoteViews views;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // The launcher uses the largest size that fits the widget.
            Map<SizeF, RemoteViews> layouts = new HashMap<>();
            layouts.put(new SizeF(WidgetLayoutSelector.SMALL_SIZE_DP, WidgetLayoutSelector.ROW_HEIGHT_DP), buildViews(context, Layout.ROW_NARROW, entry));
            layouts.put(new SizeF(WidgetLayoutSelector.ROW_WIDE_MIN_WIDTH_DP, WidgetLayoutSelector.ROW_HEIGHT_DP), buildViews(context, Layout.ROW_WIDE, entry));
            layouts.put(new SizeF(WidgetLayoutSelector.SMALL_SIZE_DP, WidgetLayoutSelector.SMALL_SIZE_DP), buildViews(context, Layout.SMALL, entry));
            layouts.put(new SizeF(WidgetLayoutSelector.MEDIUM_MIN_WIDTH_DP, WidgetLayoutSelector.SMALL_SIZE_DP), buildViews(context, Layout.MEDIUM, entry));
            views = new RemoteViews(layouts);
        } else {
            Bundle options = manager.getAppWidgetOptions(id);
            Layout layout = WidgetLayoutSelector.select(
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
            );
            views = buildViews(context, layout, entry);
        }

        manager.updateAppWidget(id, views);
    }

    @Nullable
    private static JSONObject readEntry(Context context, String today) {
        String json = WidgetBridgePlugin.prefs(context).getString(WidgetBridgePlugin.SNAPSHOT_KEY, null);
        if (json == null) return null;

        try {
            JSONObject snapshot = new JSONObject(json);
            if (snapshot.optInt("version") != SUPPORTED_VERSION) return null;

            JSONArray entries = snapshot.getJSONArray("entries");
            String[] dates = new String[entries.length()];
            for (int i = 0; i < entries.length(); i++) {
                dates[i] = entries.getJSONObject(i).getString("date");
            }

            int index = WidgetEntrySelector.select(dates, today);
            return index == -1 ? null : entries.getJSONObject(index);
        } catch (JSONException e) {
            Log.w(TAG, "The widget snapshot is not valid", e);
            return null;
        }
    }

    private static int layoutResource(Layout layout) {
        switch (layout) {
            case ROW_NARROW:
                return R.layout.widget_row_narrow;
            case ROW_WIDE:
                return R.layout.widget_row_wide;
            case MEDIUM:
                return R.layout.widget_medium;
            default:
                return R.layout.widget_small;
        }
    }

    private static RemoteViews buildViews(Context context, Layout layout, @Nullable JSONObject entry) {
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutResource(layout));
        // A RemoteViews action on a view that the layout does not have breaks the whole widget.
        boolean hasDots = layout != Layout.ROW_NARROW;
        boolean hasLabels = layout == Layout.MEDIUM;
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));

        if (entry == null) {
            views.setViewVisibility(R.id.widget_content, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            return views;
        }

        views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_empty, View.GONE);

        JSONArray salah = entry.optJSONArray("salah");
        boolean brokenToday = false;

        for (int i = 0; i < DOT_IDS.length; i++) {
            String status = statusAt(salah, i);
            if (status.equals("late") || status.equals("missed")) brokenToday = true;

            if (!hasDots) continue;

            views.setImageViewResource(DOT_IDS[i], status.isEmpty() ? R.drawable.widget_dot_empty : R.drawable.widget_dot_filled);
            views.setInt(DOT_IDS[i], "setColorFilter", statusColor(status));
            views.setViewVisibility(HALO_IDS[i], showsHalo(status) ? View.VISIBLE : View.GONE);
            if (hasLabels) {
                views.setTextViewText(LABEL_IDS[i], statusLabel(status));
            }
        }

        views.setTextViewText(R.id.widget_streak_count, String.valueOf(entry.optInt("streak")));
        if (brokenToday) {
            views.setTextColor(R.id.widget_streak_count, BROKEN_COUNT_COLOR);
        }
        return views;
    }

    private static String statusAt(@Nullable JSONArray salah, int index) {
        if (salah == null) return "";
        JSONObject item = salah.optJSONObject(index);
        return item == null ? "" : item.optString("status", "");
    }

    // Copied from salahStatusColorsHexCodes in src/utils/constants.tsx.
    private static int statusColor(String status) {
        switch (status) {
            case "group":
            case "male-alone":
            case "female-alone":
                return 0xFF5FAE82;
            case "excused":
                return 0xFF8C4FB5;
            case "late":
                return 0xFFE5B233;
            case "missed":
                return 0xFFE5484D;
            default:
                return 0xFF585858;
        }
    }

    // Copied from the labels in src/components/BottomSheets/BottomSheetSingleDateView.tsx.
    private static String statusLabel(String status) {
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

    // The same rule as showsSalahHalo in src/utils/constants.tsx.
    private static boolean showsHalo(String status) {
        return status.equals("group") || status.equals("female-alone");
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, SalahStreakWidgetProvider.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // set() can deliver hours late on API 24-30 (the window is 75% of the time to
    // the trigger). setWindow() limits the delay and needs no exact-alarm permission.
    private static void scheduleMidnightRefresh(Context context) {
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager == null) return;

        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        alarmManager.setWindow(AlarmManager.RTC, next.getTimeInMillis(), MIDNIGHT_WINDOW_MILLIS, midnightIntent(context));
    }
}
