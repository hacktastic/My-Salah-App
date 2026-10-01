package com.mysalahapp.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.javascriptengine.JavaScriptIsolate;
import androidx.javascriptengine.JavaScriptSandbox;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.google.android.gms.tasks.Tasks;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reschedules the salah notifications when the user moves while the app is closed.
 * The prayer time logic stays in JS (public/runners/android-plan.js), so this class
 * only gets the position, runs the bundle, and schedules the result.
 */
public class CurrentLocationWorker extends Worker {

    private static final String TAG = "CurrentLocationWorker";
    private static final String PLAN_BUNDLE_ASSET = "public/runners/android-plan.js";
    private static final long TIMEOUT_SECONDS = 30;

    public CurrentLocationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = CurrentLocationSyncPlugin.prefs(context);
        String state = prefs.getString(CurrentLocationSyncPlugin.STATE_KEY, null);

        if (state == null || !hasBackgroundLocation(context)) {
            return Result.success();
        }

        // androidx.javascriptengine needs API 26 and a WebView with isolate support.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !JavaScriptSandbox.isSupported()) {
            return Result.success();
        }

        try {
            Location location = Tasks.await(
                LocationServices.getFusedLocationProviderClient(context).getCurrentLocation(
                    Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                    new CancellationTokenSource().getToken()
                ),
                TIMEOUT_SECONDS,
                TimeUnit.SECONDS
            );
            if (location == null) return Result.success();

            String planJson = runPlanBundle(context, state, location);
            if ("null".equals(planJson)) return Result.success();

            schedule(context, planJson);

            JSONObject newState = new JSONObject(state);
            newState.put("latitude", location.getLatitude());
            newState.put("longitude", location.getLongitude());
            prefs.edit().putString(CurrentLocationSyncPlugin.STATE_KEY, newState.toString()).apply();
        } catch (Exception e) {
            // The next periodic run tries again; the app also refreshes on resume.
            Log.e(TAG, "Unable to refresh the current location", e);
        }

        return Result.success();
    }

    private static boolean hasBackgroundLocation(Context context) {
        boolean foreground =
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return foreground;

        return (
            foreground &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        );
    }

    private static String runPlanBundle(Context context, String state, Location location) throws Exception {
        try (
            JavaScriptSandbox sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context).get(
                TIMEOUT_SECONDS,
                TimeUnit.SECONDS
            );
            JavaScriptIsolate isolate = sandbox.createIsolate()
        ) {
            isolate.evaluateJavaScriptAsync(readAsset(context, PLAN_BUNDLE_ASSET)).get(TIMEOUT_SECONDS, TimeUnit.SECONDS);

            String call =
                "buildPlanJson(" + JSONObject.quote(state) + "," + location.getLatitude() + "," + location.getLongitude() + ")";

            return isolate.evaluateJavaScriptAsync(call).get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }
    }

    // Same calls as LocalNotificationRestoreReceiver, so these alarms share the receiver
    // and IDs with the app's alarms and replace them.
    private static void schedule(Context context, String planJson) throws Exception {
        JSONArray plan = new JSONArray(planJson);
        List<LocalNotification> notifications = new ArrayList<>();
        for (int i = 0; i < plan.length(); i++) {
            notifications.add(LocalNotification.buildNotificationFromJSObject(JSObject.fromJSONObject(plan.getJSONObject(i))));
        }

        NotificationStorage storage = new NotificationStorage(context);
        LocalNotificationManager manager = new LocalNotificationManager(storage, null, context, CapConfig.loadDefault(context));
        if (manager.schedule(null, notifications) != null) {
            storage.appendNotifications(notifications);
        }
    }

    private static String readAsset(Context context, String path) throws Exception {
        try (InputStream in = context.getAssets().open(path); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}
