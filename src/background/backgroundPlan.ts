// Shared by the iOS runner and the Android worker bundles. No Capacitor imports.
import type { userPreferencesType } from "../types/types";
import { distanceKm, LatLng, MOVE_THRESHOLD_KM } from "../utils/geo";
import {
  buildAllNotificationPlans,
  PlannedNotification,
} from "../utils/salahSchedule";

// The app writes this state after each foreground recalculation.
// The background job writes it back with new coordinates after a move.
export type BackgroundState = {
  latitude: number;
  longitude: number;
  preferences: userPreferencesType;
};

export const planAfterMove = (
  state: BackgroundState,
  position: LatLng,
  now: Date,
  platform: string,
): PlannedNotification[] | null => {
  if (distanceKm(state, position) <= MOVE_THRESHOLD_KM) return null;

  return buildAllNotificationPlans(
    position.latitude,
    position.longitude,
    state.preferences,
    now,
    platform,
  );
};
