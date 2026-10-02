import { computeStreaks } from "./streaks";
import { buildDays, EMPTY, EXCUSED, GOOD } from "./salahDays.testUtils";

// 2026-10-10 15:00 local time. The latest day in buildDays is 2026-10-10.
const TODAY = new Date(2026, 9, 10, 15, 0);

const summary = (input: ReturnType<typeof buildDays>) => {
  const result = computeStreaks(input, TODAY);
  return {
    count: result.activeStreakCount,
    streaks: result.streaks.map(({ days, isActive, excusedDays }) => ({
      days,
      isActive,
      excusedDays,
    })),
  };
};

describe("computeStreaks", () => {
  it("counts consecutive good days through today", () => {
    expect(summary(buildDays([GOOD, GOOD, GOOD, GOOD]))).toEqual({
      count: 4,
      streaks: [{ days: 4, isActive: true, excusedDays: 0 }],
    });
  });

  it("keeps the streak through yesterday when today is incomplete", () => {
    const days = buildDays([["group", "group", "", "", ""], GOOD, GOOD, GOOD]);
    expect(summary(days)).toEqual({
      count: 3,
      streaks: [{ days: 3, isActive: true, excusedDays: 0 }],
    });
  });

  it("resets to 0 at once when today has a late salah", () => {
    const days = buildDays([["group", "late", "", "", ""], GOOD, GOOD, GOOD]);
    expect(summary(days)).toEqual({
      count: 0,
      streaks: [{ days: 3, isActive: false, excusedDays: 0 }],
    });
  });

  it("resets to 0 at once when today has a missed salah", () => {
    const days = buildDays([
      ["missed", "group", "group", "group", "group"],
      GOOD,
      GOOD,
      GOOD,
    ]);
    expect(summary(days).count).toBe(0);
  });

  it("starts a new streak after a missed day and lists streaks newest first", () => {
    const days = buildDays([
      GOOD,
      ["group", "group", "missed", "group", "group"],
      GOOD,
      GOOD,
    ]);
    expect(summary(days)).toEqual({
      count: 1,
      streaks: [
        { days: 1, isActive: true, excusedDays: 0 },
        { days: 2, isActive: false, excusedDays: 0 },
      ],
    });
  });

  it("pauses on an excused day", () => {
    const days = buildDays([GOOD, EXCUSED, GOOD, GOOD]);
    expect(summary(days)).toEqual({
      count: 3,
      streaks: [{ days: 3, isActive: true, excusedDays: 1 }],
    });
  });

  it("pauses on an excused today", () => {
    expect(summary(buildDays([EXCUSED, GOOD, GOOD])).count).toBe(2);
  });

  it("treats a day with no logs as a break", () => {
    expect(summary(buildDays([GOOD, GOOD, EMPTY, GOOD])).count).toBe(2);
  });

  it("counts 1 when the start date is today and today is complete", () => {
    expect(summary(buildDays([GOOD])).count).toBe(1);
  });

  it("returns 0 when the start date is today and today is incomplete", () => {
    expect(summary(buildDays([["group", "", "", "", ""]]))).toEqual({
      count: 0,
      streaks: [],
    });
  });

  it("returns 0 and no streaks when no good period exists", () => {
    expect(
      summary(buildDays([EMPTY, ["missed", "missed", "missed", "missed", "missed"]])),
    ).toEqual({ count: 0, streaks: [] });
  });

  it("returns an empty result for no days", () => {
    expect(computeStreaks([], TODAY)).toEqual({
      activeStreakCount: 0,
      streaks: [],
    });
  });

  it("keeps the streak through yesterday when the app stays open past midnight", () => {
    // The latest day is yesterday, because App.tsx loads days only on launch or resume.
    const days = buildDays([GOOD, GOOD, GOOD], "2026-10-09");
    expect(computeStreaks(days, new Date(2026, 9, 10, 0, 30))).toMatchObject({
      activeStreakCount: 3,
      streaks: [{ days: 3, isActive: true }],
    });
  });

  it("does not change its input", () => {
    const days = buildDays([GOOD, EXCUSED, GOOD]);
    const before = JSON.parse(JSON.stringify(days));
    computeStreaks(days, TODAY);
    expect(days).toEqual(before);
  });
});
