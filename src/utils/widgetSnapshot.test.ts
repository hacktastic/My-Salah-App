import { buildWidgetSnapshot } from "./widgetSnapshot";
import { computeStreaks } from "./streaks";
import { buildDays, EXCUSED, GOOD } from "./salahDays.testUtils";

const NOW = new Date(2026, 9, 10, 15, 0);

const streaksOf = (days: ReturnType<typeof buildDays>) =>
  buildWidgetSnapshot(days, NOW)!.entries.map((entry) => entry.streak);

describe("buildWidgetSnapshot", () => {
  it("returns null when there are no days", () => {
    expect(buildWidgetSnapshot([], NOW)).toBeNull();
  });

  it("dates the three entries from the latest day", () => {
    const snapshot = buildWidgetSnapshot(buildDays([GOOD]), NOW)!;
    expect(snapshot.version).toBe(1);
    expect(snapshot.generatedAt).toBe(NOW.toISOString());
    expect(snapshot.entries.map((entry) => entry.date)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
  });

  it("keeps the entry dates when the app stays open past midnight", () => {
    const afterMidnight = new Date(2026, 9, 10, 1, 0);
    const days = buildDays([GOOD, GOOD], "2026-10-09");
    expect(
      buildWidgetSnapshot(days, afterMidnight)!.entries.map((e) => e.date),
    ).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
  });

  it("keeps the streak tomorrow when today is complete", () => {
    expect(streaksOf(buildDays([GOOD, GOOD, GOOD, GOOD]))).toEqual([4, 4, 0]);
  });

  it("ends the streak tomorrow when today is incomplete", () => {
    const days = buildDays([["group", "group", "", "", ""], GOOD, GOOD, GOOD]);
    expect(streaksOf(days)).toEqual([3, 0, 0]);
  });

  it("keeps the streak tomorrow when today is excused", () => {
    expect(streaksOf(buildDays([EXCUSED, GOOD, GOOD]))).toEqual([2, 2, 0]);
  });

  it("shows 0 for every entry when today has a late salah", () => {
    const days = buildDays([["group", "late", "", "", ""], GOOD, GOOD, GOOD]);
    expect(streaksOf(days)).toEqual([0, 0, 0]);
  });

  it("matches the in-app count for today", () => {
    const fixtures = [
      buildDays([GOOD, GOOD, GOOD]),
      buildDays([["group", "", "", "", ""], GOOD]),
      buildDays([EXCUSED, GOOD, ["late", "group", "group", "group", "group"]]),
      buildDays([["group", "", "", "", ""]]),
    ];
    for (const days of fixtures) {
      expect(buildWidgetSnapshot(days, NOW)!.entries[0].streak).toBe(
        computeStreaks(days, NOW).activeStreakCount,
      );
    }
  });

  it("lists the five salah in order, with empty statuses after today", () => {
    const days = buildDays([["group", "late", "excused", "", "missed"]]);
    const [today, tomorrow, dayAfter] = buildWidgetSnapshot(days, NOW)!.entries;
    expect(today.salah).toEqual([
      { name: "Fajr", status: "group" },
      { name: "Dhuhr", status: "late" },
      { name: "Asar", status: "excused" },
      { name: "Maghrib", status: "" },
      { name: "Isha", status: "missed" },
    ]);
    for (const entry of [tomorrow, dayAfter]) {
      expect(entry.salah.map((s) => s.name)).toEqual([
        "Fajr",
        "Dhuhr",
        "Asar",
        "Maghrib",
        "Isha",
      ]);
      expect(entry.salah.every((s) => s.status === "")).toBe(true);
    }
  });

  it("does not change its input", () => {
    const days = buildDays([GOOD, GOOD]);
    const before = JSON.parse(JSON.stringify(days));
    buildWidgetSnapshot(days, NOW);
    expect(days).toEqual(before);
  });
});
