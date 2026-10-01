import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scheduleMock = vi.fn();

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    schedule: (...args: unknown[]) => scheduleMock(...args),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn(),
  },
}));

import {
  buildAfterIshaReminderPlan,
  buildAllNotificationPlans,
  buildSalahNotificationPlan,
} from "./salahSchedule";
import {
  scheduleAfterIshaDailyNotifications,
  scheduleSalahNotifications,
} from "./helpers";
import { dictPreferencesDefaultValues } from "./constants";
import { userPreferencesType } from "../types/types";

const DOHA = { latitude: 25.286106, longitude: 51.534817 };
const NOW = new Date("2026-03-10T08:00:00Z");

const prefs: userPreferencesType = {
  ...dictPreferencesDefaultValues,
  prayerCalculationMethod: "Qatar",
};

const dohaLocations = [{ id: 1, locationName: "Doha", ...DOHA, isSelected: 1 }];

const scheduledNotifications = () =>
  scheduleMock.mock.calls.map((call) => call[0].notifications[0]);

describe("buildSalahNotificationPlan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    scheduleMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns only future times, at most 8 days ahead", () => {
    const plan = buildSalahNotificationPlan(
      DOHA.latitude,
      DOHA.longitude,
      prefs,
      "fajr",
      "on",
      NOW,
      "ios",
    );

    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(8);
    plan.forEach((n) => expect(n.at.getTime()).toBeGreaterThan(NOW.getTime()));
  });

  it("uses the adhan channel and the Android fajr sound for adhan settings", () => {
    const [first] = buildSalahNotificationPlan(
      DOHA.latitude,
      DOHA.longitude,
      prefs,
      "fajr",
      "adhan",
      NOW,
      "android",
    );

    expect(first.sound).toBe("adhan_fajr.mp3");
    expect(first.channelId).toBe("fajr-reminder-with-adhan");
    expect(first.title).toBe("Fajr");
  });

  it.each([
    ["fajr", "on"],
    ["sunrise", "on"],
    ["isha", "adhan"],
  ] as const)(
    "matches what scheduleSalahNotifications schedules for %s (%s)",
    async (salahName, setting) => {
      await scheduleSalahNotifications(
        dohaLocations,
        salahName,
        prefs,
        setting,
      );

      const plan = buildSalahNotificationPlan(
        DOHA.latitude,
        DOHA.longitude,
        prefs,
        salahName,
        setting,
        NOW,
        "web",
      );

      expect(scheduledNotifications()).toEqual(
        plan.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: n.at, allowWhileIdle: true, repeats: false },
          sound: n.sound,
          channelId: n.channelId,
        })),
      );
    },
  );

  it.each([false, true])(
    "matches what scheduleAfterIshaDailyNotifications schedules (skipToday: %s)",
    async (skipToday) => {
      await scheduleAfterIshaDailyNotifications(
        60,
        dohaLocations,
        prefs,
        skipToday,
      );

      const plan = buildAfterIshaReminderPlan(
        DOHA.latitude,
        DOHA.longitude,
        prefs,
        60,
        NOW,
        skipToday,
      );

      expect(plan[0].id).toBe(1000);
      expect(scheduledNotifications()).toEqual(
        plan.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: n.at, allowWhileIdle: true, repeats: false },
          sound: n.sound,
          channelId: n.channelId,
        })),
      );
    },
  );

  it("leaves out today's after-Isha reminder when skipToday is set", () => {
    const plan = (skipToday: boolean) =>
      buildAfterIshaReminderPlan(
        DOHA.latitude,
        DOHA.longitude,
        prefs,
        60,
        NOW,
        skipToday,
      );

    expect(plan(true)).toHaveLength(plan(false).length - 1);
    expect(plan(true)[0].at).toEqual(plan(false)[1].at);
  });
});

describe("buildAllNotificationPlans", () => {
  it("includes only salahs whose notification setting is on", () => {
    const plan = buildAllNotificationPlans(
      DOHA.latitude,
      DOHA.longitude,
      { ...prefs, fajrNotification: "on", ishaNotification: "adhan" },
      NOW,
      "ios",
      false,
    );

    const titles = new Set(plan.map((n) => n.title));
    expect(titles).toEqual(new Set(["Fajr", "Isha"]));
  });

  it("includes the after-Isha reminder when it is enabled", () => {
    const plan = buildAllNotificationPlans(
      DOHA.latitude,
      DOHA.longitude,
      {
        ...prefs,
        dailyNotification: "1",
        dailyNotificationOption: "afterIsha",
      },
      NOW,
      "ios",
      false,
    );

    expect(plan.some((n) => n.title === "Daily Reminder")).toBe(true);
  });

  it("returns nothing when no calculation method is set", () => {
    const plan = buildAllNotificationPlans(
      DOHA.latitude,
      DOHA.longitude,
      { ...prefs, prayerCalculationMethod: "", fajrNotification: "on" },
      NOW,
      "ios",
      false,
    );

    expect(plan).toEqual([]);
  });
});
