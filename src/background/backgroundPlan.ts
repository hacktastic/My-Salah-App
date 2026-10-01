// Shared by the iOS runner and the Android worker bundles. No Capacitor imports.
import { format } from "date-fns";
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
  // "yyyy-MM-dd" of the last day with every salah logged. A date, not a flag:
  // the job can run on a later day than the sync.
  fullyLoggedDate: string | null;
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
    state.fullyLoggedDate === format(now, "yyyy-MM-dd"),
  );
};
