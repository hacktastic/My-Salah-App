package com.mysalahapp.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(
    name = "CurrentLocationSync",
    permissions = { @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "backgroundLocation") }
)
public class CurrentLocationSyncPlugin extends Plugin {

    static final String STATE_KEY = "state";
    private static final String PREFS_NAME = "current_location_sync";
    private static final String WORK_NAME = "current-location-refresh";

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Saves the state for CurrentLocationWorker. A missing state stops the worker. */
    @PluginMethod
    public void sync(PluginCall call) {
        Context context = getContext();
        String state = call.getString("state");
        WorkManager workManager = WorkManager.getInstance(context);

        if (state == null) {
            prefs(context).edit().remove(STATE_KEY).apply();
            workManager.cancelUniqueWork(WORK_NAME);
        } else {
            prefs(context).edit().putString(STATE_KEY, state).apply();
            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                new PeriodicWorkRequest.Builder(CurrentLocationWorker.class, 15, TimeUnit.MINUTES).build()
            );
        }

        call.resolve();
    }

    @PluginMethod
    public void checkBackgroundLocation(PluginCall call) {
        call.resolve(backgroundLocationResult());
    }

    /** The caller must get foreground location first, or Android ignores this request. */
    @PluginMethod
    public void requestBackgroundLocation(PluginCall call) {
        if (isBackgroundLocationGranted()) {
            call.resolve(backgroundLocationResult());
            return;
        }
        requestPermissionForAlias("backgroundLocation", call, "backgroundLocationCallback");
    }

    @PermissionCallback
    private void backgroundLocationCallback(PluginCall call) {
        call.resolve(backgroundLocationResult());
    }

    // Before Android 10 there is no separate background permission.
    private boolean isBackgroundLocationGranted() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || getPermissionState("backgroundLocation") == PermissionState.GRANTED;
    }

    private JSObject backgroundLocationResult() {
        JSObject result = new JSObject();
        result.put("granted", isBackgroundLocationGranted());
        return result;
    }
}
