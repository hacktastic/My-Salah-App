package com.mysalahapp.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    static final String SNAPSHOT_KEY = "snapshot";
    private static final String PREFS_NAME = "salah_widget";

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }

        Context context = getContext();
        prefs(context).edit().putString(SNAPSHOT_KEY, json).apply();
        SalahStreakWidgetProvider.refreshAll(context);
        call.resolve();
    }
}
