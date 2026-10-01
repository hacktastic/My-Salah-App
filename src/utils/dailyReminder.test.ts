import { vi } from "vitest";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  isDayFullyLogged,
  scheduleFixedTimeDailyNotification,
} from "./helpers";

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue(undefined),
  },
}));

const scheduledDates = () =>
  vi
    .mocked(LocalNotifications.schedule)
    .mock.calls.flatMap(([opts]) => opts.notifications)
    .map((n) => n.schedule!.at!);

describe("isDayFullyLogged", () => {
  it("is true only when every salah has a status", () => {
    const salahs = {
      Fajr: "group",
      Dhuhr: "late",
      Asar: "missed",
      Maghrib: "male-alone",
      Isha: "excused",
    } as const;

    expect(isDayFullyLogged({ date: "2026-09-30", salahs })).toBe(true);
    expect(
      isDayFullyLogged({ date: "2026-09-30", salahs: { ...salahs, Isha: "" } }),
    ).toBe(false);
    expect(isDayFullyLogged(undefined)).toBe(false);
  });
});

describe("scheduleFixedTimeDailyNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    vi.mocked(LocalNotifications.schedule).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules one-off reminders starting today", async () => {
    await scheduleFixedTimeDailyNotification(21, 0, false);

    const dates = scheduledDates();
    expect(dates).toHaveLength(8);
    expect(dates[0]).toEqual(new Date(2026, 8, 30, 21, 0));
    expect(
      vi
        .mocked(LocalNotifications.schedule)
        .mock.calls.flatMap(([opts]) => opts.notifications)
        .every((n) => n.schedule!.repeats === false),
    ).toBe(true);
  });

  it("skips today's reminder when today is fully logged", async () => {
    await scheduleFixedTimeDailyNotification(21, 0, true);

    const dates = scheduledDates();
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(new Date(2026, 9, 1, 21, 0));
  });

  it("does not schedule a reminder for a time that already passed", async () => {
    await scheduleFixedTimeDailyNotification(9, 0, false);

    expect(scheduledDates()[0]).toEqual(new Date(2026, 9, 1, 9, 0));
  });
});
