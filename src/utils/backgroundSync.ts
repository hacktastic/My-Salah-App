import { Capacitor, registerPlugin } from "@capacitor/core";
import { format } from "date-fns";
import { BackgroundRunner } from "@capacitor/background-runner";
import type { BackgroundState } from "../background/backgroundPlan";
import { LocationsDataObjTypeArr, userPreferencesType } from "../types/types";
import { getActiveLocation, showConfirmMsg } from "./helpers";

// android/app/src/main/java/com/mysalahapp/app/CurrentLocationSyncPlugin.java
interface CurrentLocationSyncPlugin {
  sync(options: { state?: string }): Promise<void>;
  checkBackgroundLocation(): Promise<{ granted: boolean }>;
  requestBackgroundLocation(): Promise<{ granted: boolean }>;
}

const CurrentLocationSync = registerPlugin<CurrentLocationSyncPlugin>(
  "CurrentLocationSync",
);

const RUNNER_LABEL = "com.mysalahapp.app.locationrefresh";

export const buildBackgroundState = (
  userLocations: LocationsDataObjTypeArr,
  userPreferences: userPreferencesType,
  isTodayFullyLogged: boolean,
  now = new Date(),
): BackgroundState | undefined => {
  const activeLocation = getActiveLocation(userLocations);
  if (activeLocation?.isCurrentLocation !== 1) return;

  return {
    latitude: activeLocation.latitude,
    longitude: activeLocation.longitude,
    preferences: userPreferences,
    fullyLoggedDate: isTodayFullyLogged ? format(now, "yyyy-MM-dd") : null,
  };
};

// A missing state tells the background job to stop, for example when the user
// selects a static location.
export const syncBackgroundState = async (
  userLocations: LocationsDataObjTypeArr,
  userPreferences: userPreferencesType,
  isTodayFullyLogged: boolean,
) => {
  const state = buildBackgroundState(
    userLocations,
    userPreferences,
    isTodayFullyLogged,
  );

  try {
    if (Capacitor.getPlatform() === "ios") {
      await BackgroundRunner.dispatchEvent({
        label: RUNNER_LABEL,
        event: "syncState",
        details: state ? { state } : {},
      });
    } else if (Capacitor.getPlatform() === "android") {
      await CurrentLocationSync.sync({
        state: state ? JSON.stringify(state) : undefined,
      });
    }
  } catch (error) {
    console.error("syncBackgroundState failed", error);
  }
};

// iOS asks for "Always" only while the status is still notDetermined, so the
// GPS card uses this request in place of Geolocation.requestPermissions on iOS.
export const requestIOSLocationPermission = async () => {
  const { geolocation } = await BackgroundRunner.requestPermissions({
    apis: ["geolocation"],
  });
  return geolocation === "granted";
};

// Google Play requires an in-app explanation before the background request.
export const requestAndroidBackgroundLocation = async () => {
  if (Capacitor.getPlatform() !== "android") return;

  const { granted } = await CurrentLocationSync.checkBackgroundLocation();
  if (granted) return;

  const accepted = await showConfirmMsg(
    "Keep Salah times correct when you travel",
    'My Salah App uses your location in the background to update Salah times and reminders when you move to a new area, even when the app is closed. Your location stays on your device. On the next screen, choose "Allow all the time".',
  );
  if (!accepted) return;

  await CurrentLocationSync.requestBackgroundLocation();
};

export const hasBackgroundLocation = async () => {
  if (Capacitor.getPlatform() !== "android") return true;
  return (await CurrentLocationSync.checkBackgroundLocation()).granted;
};
