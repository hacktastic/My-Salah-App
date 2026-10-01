import { describe, expect, it } from "vitest";
import { dictPreferencesDefaultValues } from "../utils/constants";
import { BackgroundState, planAfterMove } from "./backgroundPlan";

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
// 09:00 local is before London's Isha (19:42 UTC) for host time zones UTC-10 to UTC+14.
const NOW = new Date(2026, 2, 10, 9, 0);

const state: BackgroundState = {
  latitude: 25.286106,
  longitude: 51.534817,
  preferences: {
    ...dictPreferencesDefaultValues,
    prayerCalculationMethod: "MuslimWorldLeague",
    dailyNotification: "1",
    dailyNotificationOption: "afterIsha",
  },
  fullyLoggedDate: null,
};

const reminders = (fullyLoggedDate: string | null) =>
  (
    planAfterMove({ ...state, fullyLoggedDate }, LONDON, NOW, "ios") ?? []
  ).filter((n) => n.title === "Daily Reminder");

describe("planAfterMove", () => {
  it("leaves out today's after-Isha reminder when today is fully logged", () => {
    expect(reminders("2026-03-10")).toHaveLength(reminders(null).length - 1);
  });

  it("keeps today's reminder when the logged date is an earlier day", () => {
    expect(reminders("2026-03-09")).toHaveLength(reminders(null).length);
  });

  it("returns null when the user did not move more than 5 km", () => {
    expect(
      planAfterMove(state, { latitude: 25.29, longitude: 51.54 }, NOW, "ios"),
    ).toBeNull();
  });
});
