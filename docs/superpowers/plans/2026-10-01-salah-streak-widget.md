# Salah Streak Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only home-screen widget on iOS and Android that shows the current salah streak and the five salah statuses for today.

**Architecture:** The TypeScript code calculates a JSON snapshot with three dated entries (today, today+1, today+2). A small `WidgetBridge` Capacitor plugin writes the snapshot to native shared storage: an App Group `UserDefaults` on iOS and `SharedPreferences` on Android. The native widgets select the latest entry whose date is today or earlier, and draw it. The native code contains no streak rules.

**Tech Stack:** TypeScript, React 18, Vitest, date-fns 2, Capacitor 8, SwiftUI and WidgetKit (iOS 15), Java with `AppWidgetProvider` and `RemoteViews` (Android minSdk 24).

**Spec:** `docs/superpowers/specs/2026-10-01-salah-streak-widget-design.md`

## Global Constraints

- Work on the branch `hacktastic/streak-widget`.
- Commit as `Jackson Coakley <6051613+hacktastic@users.noreply.github.com>`. Use this form for every commit:
  `GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "<message>"`
- Do not add a `Co-Authored-By` trailer to commits.
- Write commit messages and code comments in Simplified Technical English. Comment only the non-obvious reason.
- Day strings use the format `"yyyy-MM-dd"` in local time. String order is date order.
- The salah names are `Fajr`, `Dhuhr`, `Asar`, `Maghrib`, `Isha`, in that order. The name is `Asar`, not `Asr`.
- The snapshot `version` is `1`.
- The plugin JS name is `WidgetBridge`. Its only method is `update({ json: string })`.
- iOS App Group: `group.com.mysalahapp.app`. iOS key: `widgetSnapshot`.
- Android `SharedPreferences` name: `salah_widget`. Android key: `snapshot`.
- The iOS widget bundle ID is `com.mysalahapp.app.SalahStreakWidget`. Its deployment target is iOS 15.0. It uses Swift language version 5.
- Status colors: `group`, `male-alone`, `female-alone` `#5FAE82`; `excused` `#8C4FB5`; `late` `#E5B233`; `missed` `#E5484D`; empty `#585858`.
- The gold halo is `#F2C94C`, for `group` and `female-alone` only, on the medium size only.
- Theme colors: background `#F7F7F7` light and `#1B1B1C` dark; text `#000000` light and `#FFFFFF` dark; wreath `#000000` light and `#E9E9E9` dark; secondary text `#8E8E93` in both modes.
- The empty-state text is `Open My Salah App to start your streak`.
- Baselines on this branch before Task 1: `npx tsc --noEmit` passes. `npm run lint` reports `40 problems (31 errors, 9 warnings)`. The memory notes say that 28 render tests fail on `main`. The pure tests in `src/utils/` pass.
- Build Android with: `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew <task>`. Do not create `android/local.properties`.
- Use Xcode through `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. Do not run `xcode-select`. CocoaPods is not installed, so the `App` target cannot build on this machine. The widget target uses no pods, so it can build.

### Decisions made while planning (differences from the spec text)

- **No `widgetURL`.** The app has no iOS URL scheme. A tap on a widget without `widgetURL` opens the app, which is the required behavior. On Android, the tap opens `MainActivity`.
- **Resume sync.** The widget effect runs when `fetchedSalahData` changes. On resume on a new day, `App.tsx:199-201` calls `fetchDataFromDB`, which changes `fetchedSalahData`. This satisfies the spec item "the call also runs on app resume". A resume on the same day has no new data to send.
- **Entry dates come from `days[0].date`, not from the clock.** If the app stays open past midnight, `days[0]` is still yesterday. The entries then start at yesterday, and the native rule still selects the correct entry.
- **Secondary text is one fixed gray (`#8E8E93`).** This removes the need to resolve the night mode in Java code.
- **Extra native checks.** A JUnit test covers the Android entry selection, and a macOS Swift check covers the iOS decode and selection code.

## Review Focus

1. **The app stays open past midnight.** `fetchedSalahData[0]` is yesterday, so the snapshot entries must start at that date. The widget must show the today+1 entry. Task 2 has a test for this.
2. **The device date is before the first entry or after the last entry.** This happens when the clock is set back or after a time-zone change. The widget must show the empty state before the first entry, and the last entry after the last entry. Task 4 (Java) and Task 7 (Swift) test this.
3. **The start date is today and today is incomplete.** The count must be 0, not an old value. Task 1 has a test for this.
4. **A single log passes the live state array to `generateStreaks`** (`BottomSheetSalahStatus.tsx:253`). The streak function must not change the order of its input, because the snapshot reads `fetchedSalahData` newest first. Tasks 1 and 2 have tests for this.
5. **The widget count and the in-app count differ for the same data.** Task 2 has a test that compares `entries[0].streak` with `computeStreaks(days, now).activeStreakCount`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/streaks.ts` (create) | Pure streak rules, moved from `App.tsx`. |
| `src/utils/streaks.test.ts` (create) | Characterization tests for the streak rules. |
| `src/utils/salahDays.testUtils.ts` (create) | A test helper that builds newest-first day lists. |
| `src/utils/widgetSnapshot.ts` (create) | The `WidgetSnapshot` type and `buildWidgetSnapshot`. |
| `src/utils/widgetSnapshot.test.ts` (create) | Tests for the snapshot entries. |
| `src/utils/widgetSync.ts` (create) | Registers `WidgetBridge` and sends the snapshot. |
| `src/utils/widgetSync.test.ts` (create) | Tests for the platform guard and the error handling. |
| `src/App.tsx` (modify) | Calls `computeStreaks`, and runs the widget sync effect. |
| `android/.../WidgetEntrySelector.java` (create) | Pure entry selection by date string. |
| `android/.../WidgetBridgePlugin.java` (create) | Writes the snapshot and refreshes the widgets. |
| `android/.../SalahStreakWidgetProvider.java` (create) | Reads the snapshot, builds `RemoteViews`, and schedules the midnight refresh. |
| `android/app/src/main/res/...` (create) | Layouts, drawables, colors, strings, and the provider info XML. |
| `ios/App/App/WidgetBridgePlugin.swift` (create) | Writes the snapshot to the App Group and reloads the timelines. |
| `ios/App/App/MainViewController.swift` (create) | Registers `WidgetBridgePlugin`. |
| `ios/App/SalahStreakWidget/*.swift` (create) | The widget extension: model, store, provider, styles, and views. |

The Android package path is `android/app/src/main/java/com/mysalahapp/app/`.

---

### Task 1: Move the streak rules into a pure module

**Files:**
- Create: `src/utils/salahDays.testUtils.ts`
- Create: `src/utils/streaks.test.ts`
- Create: `src/utils/streaks.ts`
- Modify: `src/App.tsx:62-71` (the `date-fns` import), `src/App.tsx:903-1039` (`generateStreaks` and `handleEndOfStreak`)

**Interfaces:**
- Consumes: `SalahRecordsArrayType`, `SalahStatusType`, `streakDatesObjType` from `src/types/types.tsx`.
- Produces:
  - `computeStreaks(days: SalahRecordsArrayType, today: Date): StreakResult`. `days` is newest first.
  - `type StreakResult = { activeStreakCount: number; streaks: streakDatesObjType[] }`. `streaks` is sorted newest first by `startDate`.
  - Test helpers: `buildDays(statusesByDay: SalahStatusType[][], latestDate?: string): SalahRecordsArrayType`, `GOOD`, `EXCUSED`, `EMPTY`.

- [ ] **Step 1: Write the test helper**

Create `src/utils/salahDays.testUtils.ts`:

```ts
import { format, parseISO, subDays } from "date-fns";
import { SalahRecordsArrayType, SalahStatusType } from "../types/types";

export const GOOD: SalahStatusType[] = [
  "group",
  "male-alone",
  "female-alone",
  "group",
  "group",
];
export const EXCUSED: SalahStatusType[] = [
  "excused",
  "excused",
  "excused",
  "excused",
  "excused",
];
export const EMPTY: SalahStatusType[] = ["", "", "", "", ""];

// Builds days newest first, as App.tsx does. statusesByDay[0] is the latest day.
export const buildDays = (
  statusesByDay: SalahStatusType[][],
  latestDate = "2026-10-10",
): SalahRecordsArrayType =>
  statusesByDay.map((s, index) => ({
    date: format(subDays(parseISO(latestDate), index), "yyyy-MM-dd"),
    salahs: { Fajr: s[0], Dhuhr: s[1], Asar: s[2], Maghrib: s[3], Isha: s[4] },
  }));
```

- [ ] **Step 2: Write the failing characterization tests**

Create `src/utils/streaks.test.ts`:

```ts
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

  it("does not change its input", () => {
    const days = buildDays([GOOD, EXCUSED, GOOD]);
    const before = JSON.parse(JSON.stringify(days));
    computeStreaks(days, TODAY);
    expect(days).toEqual(before);
  });
});
```

- [ ] **Step 3: Run the tests to make sure they fail**

Run: `npx vitest run src/utils/streaks.test.ts`
Expected: FAIL, because Vite cannot resolve `./streaks`.

- [ ] **Step 4: Write the module**

Create `src/utils/streaks.ts`. The loop is the code from `App.tsx:903-1039`, with three changes. The function copies its input before it reverses it. The function returns its results and does not call state setters. The count starts at 0, so a run with no streak period gives 0.

```ts
import { differenceInDays, parseISO, subDays } from "date-fns";
import {
  SalahRecordsArrayType,
  SalahStatusType,
  streakDatesObjType,
} from "../types/types";

export type StreakResult = {
  activeStreakCount: number;
  streaks: streakDatesObjType[];
};

const streakBreakingStatuses: SalahStatusType[] = ["missed", "late", ""];

const isStreakBreakingStatus = (statuses: SalahStatusType[]) =>
  statuses.some((status) => streakBreakingStatuses.includes(status));

const isConsecutiveDay = (date2: Date, date1: Date) =>
  differenceInDays(date1, date2) === 1;

// days is newest first, as App.tsx builds it. The rules are the same as the
// earlier code in App.tsx, including its edge cases.
export const computeStreaks = (
  days: SalahRecordsArrayType,
  today: Date,
): StreakResult => {
  const oldestFirst = [...days].reverse();
  const streaks: streakDatesObjType[] = [];
  const streakDatesArr: Date[] = [];
  let excusedDays = 0;
  let isActiveStreak = false;
  let activeStreakCount = 0;

  const endStreak = () => {
    if (streakDatesArr.length > 0) {
      const streakDays =
        streakDatesArr.length === 1
          ? 1
          : differenceInDays(
              streakDatesArr[streakDatesArr.length - 1],
              subDays(streakDatesArr[0], 1),
            );
      activeStreakCount = isActiveStreak ? streakDays - excusedDays : 0;
      streaks.push({
        startDate: streakDatesArr[0],
        endDate: streakDatesArr[streakDatesArr.length - 1],
        days: streakDays - excusedDays,
        isActive: isActiveStreak,
        excusedDays,
      });
      streakDatesArr.length = 0;
    }
    excusedDays = 0;
  };

  if (oldestFirst.length === 1) {
    const statuses = Object.values(oldestFirst[0].salahs);
    if (!isStreakBreakingStatus(statuses)) {
      if (statuses.includes("excused")) excusedDays += 1;
      streakDatesArr.push(today);
      isActiveStreak = true;
      endStreak();
    }
    return { activeStreakCount, streaks };
  }

  for (let i = 1; i < oldestFirst.length; i++) {
    const statuses = Object.values(oldestFirst[i].salahs);
    const previousDate = parseISO(oldestFirst[i - 1].date);
    const currentDate = parseISO(oldestFirst[i].date);
    const previousDayIsYesterday = isConsecutiveDay(previousDate, today);

    if (
      previousDayIsYesterday &&
      !statuses.includes("late") &&
      !statuses.includes("missed")
    ) {
      isActiveStreak = true;
    }

    if (
      isConsecutiveDay(previousDate, currentDate) &&
      !isStreakBreakingStatus(statuses)
    ) {
      if (statuses.includes("excused")) excusedDays += 1;

      if (
        i === 1 &&
        !isStreakBreakingStatus(Object.values(oldestFirst[0].salahs))
      ) {
        streakDatesArr.push(previousDate, currentDate);
      } else {
        streakDatesArr.push(currentDate);
      }

      if (previousDayIsYesterday) endStreak();
    } else {
      endStreak();
    }
  }

  streaks.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return { activeStreakCount, streaks };
};
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npx vitest run src/utils/streaks.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Make `App.tsx` call the module**

In `src/App.tsx`, replace the whole `generateStreaks` function and the whole `handleEndOfStreak` function (lines 903-1039, from `const generateStreaks = (` through the closing `};` of `handleEndOfStreak`) with:

```ts
  const generateStreaks = (fetchedSalahData: SalahRecordsArrayType) => {
    const { activeStreakCount, streaks } = computeStreaks(
      fetchedSalahData,
      new Date(),
    );
    setActiveStreakCount(activeStreakCount);
    setStreakDatesObjectsArr(streaks);
  };
```

Add this import next to the other `./utils/...` imports:

```ts
import { computeStreaks } from "./utils/streaks";
```

Remove `parseISO,` from the `date-fns` import at `src/App.tsx:62-71`. After the change, nothing else in `App.tsx` uses it. Keep `differenceInDays` and `subDays`, because `handleSalahTrackingDataFromDB` uses them. Keep the `generateStreaks` prop signature, so `HomePage`, `SalahTable`, and `BottomSheetSalahStatus` do not change.

- [ ] **Step 7: Check types and lint**

Run: `npx tsc --noEmit`
Expected: no output and exit code 0. If `tsc` reports an unused import, remove that import.

Run: `npm run lint 2>&1 | grep problems`
Expected: `31 errors` or fewer.

- [ ] **Step 8: Commit**

```bash
git add src/utils/streaks.ts src/utils/streaks.test.ts src/utils/salahDays.testUtils.ts src/App.tsx
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "refactor: move the streak rules into a pure module

The new computeStreaks function does not reverse its input in place,
and it returns 0 when no streak period exists."
```

---

### Task 2: Build the widget snapshot

**Files:**
- Create: `src/utils/widgetSnapshot.test.ts`
- Create: `src/utils/widgetSnapshot.ts`

**Interfaces:**
- Consumes: `computeStreaks(days, today)` from Task 1. `salahNamesArr` from `src/utils/constants.tsx:144`. Test helpers from `src/utils/salahDays.testUtils.ts`.
- Produces:
  - `type WidgetSalah = { name: SalahNamesType; status: SalahStatusType }`
  - `type WidgetEntry = { date: string; streak: number; salah: WidgetSalah[] }`
  - `type WidgetSnapshot = { version: 1; generatedAt: string; entries: WidgetEntry[] }`
  - `buildWidgetSnapshot(days: SalahRecordsArrayType, now: Date): WidgetSnapshot | null`. It returns `null` when `days` is empty.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/widgetSnapshot.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/utils/widgetSnapshot.test.ts`
Expected: FAIL, because Vite cannot resolve `./widgetSnapshot`.

- [ ] **Step 3: Write the module**

Create `src/utils/widgetSnapshot.ts`:

```ts
import { addDays, format, parseISO } from "date-fns";
import {
  SalahNamesType,
  SalahRecordType,
  SalahRecordsArrayType,
  SalahStatusType,
} from "../types/types";
import { salahNamesArr } from "./constants";
import { computeStreaks } from "./streaks";

export type WidgetSalah = { name: SalahNamesType; status: SalahStatusType };
export type WidgetEntry = { date: string; streak: number; salah: WidgetSalah[] };
export type WidgetSnapshot = {
  version: 1;
  generatedAt: string;
  entries: WidgetEntry[];
};

const ENTRY_COUNT = 3;

const emptyDay = (date: Date): SalahRecordType => ({
  date: format(date, "yyyy-MM-dd"),
  salahs: { Fajr: "", Dhuhr: "", Asar: "", Maghrib: "", Isha: "" },
});

// Entry dates come from days[0], not from now. If the app stays open past
// midnight, days[0] is yesterday, and the native widget still selects the
// correct entry.
export const buildWidgetSnapshot = (
  days: SalahRecordsArrayType,
  now: Date,
): WidgetSnapshot | null => {
  if (days.length === 0) return null;

  const latestDay = parseISO(days[0].date);
  const entries: WidgetEntry[] = [];
  let paddedDays = days;

  for (let offset = 0; offset < ENTRY_COUNT; offset++) {
    const entryDate = addDays(latestDay, offset);
    if (offset > 0) paddedDays = [emptyDay(entryDate), ...paddedDays];

    entries.push({
      date: format(entryDate, "yyyy-MM-dd"),
      streak: computeStreaks(paddedDays, entryDate).activeStreakCount,
      // SalahNamesType also allows the optional "Asr" key, so the type permits undefined.
      salah: salahNamesArr.map((name) => ({
        name,
        status: paddedDays[0].salahs[name] ?? "",
      })),
    });
  }

  return { version: 1, generatedAt: now.toISOString(), entries };
};
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/utils/widgetSnapshot.test.ts src/utils/streaks.test.ts`
Expected: PASS, 23 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/widgetSnapshot.ts src/utils/widgetSnapshot.test.ts
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat: build the snapshot for the salah streak widget"
```

---

### Task 3: Send the snapshot from the app

**Files:**
- Create: `src/utils/widgetSync.test.ts`
- Create: `src/utils/widgetSync.ts`
- Modify: `src/App.tsx` (add one effect after the `syncBackgroundState` effect at `src/App.tsx:549-563`, plus two imports)

**Interfaces:**
- Consumes: `buildWidgetSnapshot` and `WidgetSnapshot` from Task 2.
- Produces: `syncWidget(snapshot: WidgetSnapshot | null): Promise<void>`. The native plugins in Tasks 5 and 6 implement `WidgetBridge.update({ json: string })`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/widgetSync.test.ts`:

```ts
import { vi } from "vitest";
import type { WidgetSnapshot } from "./widgetSnapshot";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  isNativePlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  registerPlugin: () => ({ update: mocks.update }),
}));

import { syncWidget } from "./widgetSync";

const SNAPSHOT: WidgetSnapshot = {
  version: 1,
  generatedAt: "2026-10-10T15:00:00.000Z",
  entries: [],
};

describe("syncWidget", () => {
  beforeEach(() => {
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.isNativePlatform.mockReset().mockReturnValue(true);
  });

  it("sends the snapshot as JSON on a native platform", async () => {
    await syncWidget(SNAPSHOT);
    expect(mocks.update).toHaveBeenCalledWith({
      json: JSON.stringify(SNAPSHOT),
    });
  });

  it("does nothing on web", async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    await syncWidget(SNAPSHOT);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does nothing when there is no snapshot", async () => {
    await syncWidget(null);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("logs a plugin error and does not throw it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockRejectedValue(new Error("not implemented"));
    await expect(syncWidget(SNAPSHOT)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
```

- [ ] **Step 2: Run the tests to make sure they fail**

Run: `npx vitest run src/utils/widgetSync.test.ts`
Expected: FAIL, because Vite cannot resolve `./widgetSync`.

- [ ] **Step 3: Write the module**

Create `src/utils/widgetSync.ts`:

```ts
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { WidgetSnapshot } from "./widgetSnapshot";

// ios/App/App/WidgetBridgePlugin.swift and
// android/app/src/main/java/com/mysalahapp/app/WidgetBridgePlugin.java
interface WidgetBridgePlugin {
  update(options: { json: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

// A widget failure must never block a salah log, so this function logs errors
// and does not throw them.
export const syncWidget = async (snapshot: WidgetSnapshot | null) => {
  if (!snapshot || !Capacitor.isNativePlatform()) return;

  try {
    await WidgetBridge.update({ json: JSON.stringify(snapshot) });
  } catch (error) {
    console.error("syncWidget failed", error);
  }
};
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npx vitest run src/utils/widgetSync.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the effect to `App.tsx`**

Add these imports next to the other `./utils/...` imports in `src/App.tsx`:

```ts
import { buildWidgetSnapshot } from "./utils/widgetSnapshot";
import { syncWidget } from "./utils/widgetSync";
```

Add this effect directly after the `syncBackgroundState` effect, which ends at `src/App.tsx:563`:

```ts
  // Every write path sets a new fetchedSalahData array, so this effect covers
  // single logs, batch updates, imports, start-date changes, and a new day.
  useEffect(() => {
    if (!isDatabaseInitialised) return;
    syncWidget(buildWidgetSnapshot(fetchedSalahData, new Date()));
  }, [isDatabaseInitialised, fetchedSalahData]);
```

- [ ] **Step 6: Check types, lint, and the pure tests**

Run: `npx tsc --noEmit`
Expected: exit code 0.

Run: `npm run lint 2>&1 | grep problems`
Expected: `31 errors` or fewer.

Run: `npx vitest run src/utils`
Expected: all test files in `src/utils` pass.

- [ ] **Step 7: Commit**

```bash
git add src/utils/widgetSync.ts src/utils/widgetSync.test.ts src/App.tsx
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat: send the widget snapshot to the WidgetBridge plugin"
```

---

### Task 4: Android entry selection

**Files:**
- Create: `android/app/src/test/java/com/mysalahapp/app/WidgetEntrySelectorTest.java`
- Create: `android/app/src/main/java/com/mysalahapp/app/WidgetEntrySelector.java`

**Interfaces:**
- Produces: `static int WidgetEntrySelector.select(String[] dates, String today)`. It returns the index of the latest date that is on or before `today`, or `-1`.

- [ ] **Step 1: Write the failing test**

Create `android/app/src/test/java/com/mysalahapp/app/WidgetEntrySelectorTest.java`:

```java
package com.mysalahapp.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class WidgetEntrySelectorTest {

    private static final String[] DATES = { "2026-10-10", "2026-10-11", "2026-10-12" };

    @Test
    public void selectsTodayWhenTodayHasAnEntry() {
        assertEquals(0, WidgetEntrySelector.select(DATES, "2026-10-10"));
        assertEquals(1, WidgetEntrySelector.select(DATES, "2026-10-11"));
    }

    @Test
    public void selectsTheLastEntryAfterAllEntries() {
        assertEquals(2, WidgetEntrySelector.select(DATES, "2026-11-01"));
    }

    @Test
    public void returnsMinusOneBeforeTheFirstEntry() {
        assertEquals(-1, WidgetEntrySelector.select(DATES, "2026-10-09"));
    }

    @Test
    public void returnsMinusOneWithNoEntries() {
        assertEquals(-1, WidgetEntrySelector.select(new String[0], "2026-10-10"));
    }

    @Test
    public void doesNotDependOnTheEntryOrder() {
        String[] unordered = { "2026-10-12", "2026-10-10", "2026-10-11" };
        assertEquals(2, WidgetEntrySelector.select(unordered, "2026-10-11"));
    }
}
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew :app:testDebugUnitTest --tests com.mysalahapp.app.WidgetEntrySelectorTest`
Expected: FAIL with `cannot find symbol` for `WidgetEntrySelector`.

- [ ] **Step 3: Write the class**

Create `android/app/src/main/java/com/mysalahapp/app/WidgetEntrySelector.java`:

```java
package com.mysalahapp.app;

final class WidgetEntrySelector {

    private WidgetEntrySelector() {}

    /** Dates are "yyyy-MM-dd", so string order is date order. Returns -1 when no date is on or before today. */
    static int select(String[] dates, String today) {
        int best = -1;
        for (int i = 0; i < dates.length; i++) {
            if (dates[i].compareTo(today) <= 0 && (best == -1 || dates[i].compareTo(dates[best]) > 0)) {
                best = i;
            }
        }
        return best;
    }
}
```

- [ ] **Step 4: Run the test to make sure it passes**

Run the same command as Step 2.
Expected: `BUILD SUCCESSFUL`, 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/mysalahapp/app/WidgetEntrySelector.java android/app/src/test/java/com/mysalahapp/app/WidgetEntrySelectorTest.java
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat(android): select the widget entry for today"
```

---

### Task 5: Android widget, plugin, and resources

**Files:**
- Create: `android/app/src/main/java/com/mysalahapp/app/WidgetBridgePlugin.java`
- Create: `android/app/src/main/java/com/mysalahapp/app/SalahStreakWidgetProvider.java`
- Create: `android/app/src/main/res/xml/salah_streak_widget_info.xml`
- Create: `android/app/src/main/res/layout/widget_small.xml`, `android/app/src/main/res/layout/widget_medium.xml`
- Create: `android/app/src/main/res/drawable/widget_background.xml`, `widget_dot_filled.xml`, `widget_dot_empty.xml`, `widget_halo.xml`, `widget_laurel_left.xml`, `widget_laurel_right.xml`
- Create: `android/app/src/main/res/values/widget_colors.xml`, `android/app/src/main/res/values-night/widget_colors.xml`
- Modify: `android/app/src/main/res/values/strings.xml`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/java/com/mysalahapp/app/MainActivity.java:10`

**Interfaces:**
- Consumes: `WidgetEntrySelector.select` from Task 4. The JSON shape from Task 2.
- Produces: the JS plugin `WidgetBridge` with `update({ json })`, which Task 3 calls. `WidgetBridgePlugin.prefs(Context)` and `WidgetBridgePlugin.SNAPSHOT_KEY`. `SalahStreakWidgetProvider.refreshAll(Context)`.

- [ ] **Step 1: Write the colors and strings**

Create `android/app/src/main/res/values/widget_colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="widget_background">#F7F7F7</color>
    <color name="widget_text">#000000</color>
    <color name="widget_text_secondary">#8E8E93</color>
    <color name="widget_wreath">#000000</color>
    <color name="widget_halo">#F2C94C</color>
</resources>
```

Create `android/app/src/main/res/values-night/widget_colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="widget_background">#1B1B1C</color>
    <color name="widget_text">#FFFFFF</color>
    <color name="widget_wreath">#E9E9E9</color>
</resources>
```

Add these lines inside `<resources>` in `android/app/src/main/res/values/strings.xml`:

```xml
    <string name="widget_name">Salah Streak</string>
    <string name="widget_description">Your current streak and today\'s salah.</string>
    <string name="widget_empty">Open My Salah App to start your streak</string>
    <string name="widget_day_streak">day streak</string>
```

- [ ] **Step 2: Write the shape drawables**

Create `android/app/src/main/res/drawable/widget_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/widget_background" />
    <corners android:radius="16dp" />
</shape>
```

Create `android/app/src/main/res/drawable/widget_dot_filled.xml`. The provider sets the status color with a color filter, so the shape is white.

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#FFFFFFFF" />
</shape>
```

Create `android/app/src/main/res/drawable/widget_dot_empty.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <stroke android:width="1.5dp" android:color="#FFFFFFFF" />
</shape>
```

Create `android/app/src/main/res/drawable/widget_halo.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <stroke android:width="1.5dp" android:color="@color/widget_halo" />
</shape>
```

- [ ] **Step 3: Generate the laurel vector drawables from the home-page artwork**

The home-page wreath in `src/pages/HomePage.tsx:132-192` is two inline SVGs: a left branch with `viewBox="0 0 351 547"` and a right branch with `viewBox="0 0 352 547"`. Each SVG has two paths. Run this script from the repository root:

```bash
node --input-type=module <<'EOF'
import fs from "node:fs";
const src = fs.readFileSync("src/pages/HomePage.tsx", "utf8");
const paths = (viewBox) => {
  const start = src.indexOf(`viewBox="${viewBox}"`);
  if (start === -1) throw new Error(`viewBox ${viewBox} not found`);
  const end = src.indexOf("</svg>", start);
  const found = [...src.slice(start, end).matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  if (found.length !== 2) throw new Error(`expected 2 paths for ${viewBox}, found ${found.length}`);
  return found;
};
const vector = (width, d) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated from the wreath in src/pages/HomePage.tsx. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="16dp"
    android:height="25dp"
    android:viewportWidth="${width}"
    android:viewportHeight="547">
${d.map((p) => `    <path android:fillColor="@color/widget_wreath" android:pathData="${p}" />`).join("\n")}
</vector>
`;
const dir = "android/app/src/main/res/drawable";
fs.writeFileSync(`${dir}/widget_laurel_left.xml`, vector(351, paths("0 0 351 547")));
fs.writeFileSync(`${dir}/widget_laurel_right.xml`, vector(352, paths("0 0 352 547")));
console.log("wrote widget_laurel_left.xml and widget_laurel_right.xml");
EOF
```

Expected: `wrote widget_laurel_left.xml and widget_laurel_right.xml`.

- [ ] **Step 4: Write the small layout**

Create `android/app/src/main/res/layout/widget_small.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <TextView
        android:id="@+id/widget_empty"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:gravity="center"
        android:text="@string/widget_empty"
        android:textColor="@color/widget_text"
        android:textSize="13sp"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/widget_content"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:gravity="center"
        android:orientation="vertical">

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <ImageView
                android:layout_width="16dp"
                android:layout_height="25dp"
                android:importantForAccessibility="no"
                android:src="@drawable/widget_laurel_left" />

            <TextView
                android:id="@+id/widget_streak_count"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:paddingStart="6dp"
                android:paddingEnd="6dp"
                android:textColor="@color/widget_text"
                android:textSize="34sp"
                android:textStyle="bold" />

            <ImageView
                android:layout_width="16dp"
                android:layout_height="25dp"
                android:importantForAccessibility="no"
                android:src="@drawable/widget_laurel_right" />
        </LinearLayout>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/widget_day_streak"
            android:textColor="@color/widget_text_secondary"
            android:textSize="12sp" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="10dp"
            android:orientation="horizontal">

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="4dp"
                android:layout_marginEnd="4dp"
                android:gravity="center_horizontal"
                android:orientation="vertical">
                <ImageView
                    android:id="@+id/dot_0"
                    android:layout_width="12dp"
                    android:layout_height="12dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_dot_empty" />
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="3dp"
                    android:text="F"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="9sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="4dp"
                android:layout_marginEnd="4dp"
                android:gravity="center_horizontal"
                android:orientation="vertical">
                <ImageView
                    android:id="@+id/dot_1"
                    android:layout_width="12dp"
                    android:layout_height="12dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_dot_empty" />
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="3dp"
                    android:text="D"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="9sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="4dp"
                android:layout_marginEnd="4dp"
                android:gravity="center_horizontal"
                android:orientation="vertical">
                <ImageView
                    android:id="@+id/dot_2"
                    android:layout_width="12dp"
                    android:layout_height="12dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_dot_empty" />
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="3dp"
                    android:text="A"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="9sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="4dp"
                android:layout_marginEnd="4dp"
                android:gravity="center_horizontal"
                android:orientation="vertical">
                <ImageView
                    android:id="@+id/dot_3"
                    android:layout_width="12dp"
                    android:layout_height="12dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_dot_empty" />
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="3dp"
                    android:text="M"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="9sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="4dp"
                android:layout_marginEnd="4dp"
                android:gravity="center_horizontal"
                android:orientation="vertical">
                <ImageView
                    android:id="@+id/dot_4"
                    android:layout_width="12dp"
                    android:layout_height="12dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_dot_empty" />
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="3dp"
                    android:text="I"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="9sp" />
            </LinearLayout>
        </LinearLayout>
    </LinearLayout>
</FrameLayout>
```

- [ ] **Step 5: Write the medium layout**

Create `android/app/src/main/res/layout/widget_medium.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <TextView
        android:id="@+id/widget_empty"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:gravity="center"
        android:text="@string/widget_empty"
        android:textColor="@color/widget_text"
        android:textSize="13sp"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/widget_content"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center"
            android:orientation="vertical">

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <ImageView
                    android:layout_width="16dp"
                    android:layout_height="25dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_laurel_left" />

                <TextView
                    android:id="@+id/widget_streak_count"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:paddingStart="6dp"
                    android:paddingEnd="6dp"
                    android:textColor="@color/widget_text"
                    android:textSize="34sp"
                    android:textStyle="bold" />

                <ImageView
                    android:layout_width="16dp"
                    android:layout_height="25dp"
                    android:importantForAccessibility="no"
                    android:src="@drawable/widget_laurel_right" />
            </LinearLayout>

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="@string/widget_day_streak"
                android:textColor="@color/widget_text_secondary"
                android:textSize="12sp" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:orientation="vertical">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:gravity="center_vertical"
                android:orientation="horizontal">
                <TextView
                    android:layout_width="60dp"
                    android:layout_height="wrap_content"
                    android:text="Fajr"
                    android:textColor="@color/widget_text"
                    android:textSize="12sp" />
                <FrameLayout
                    android:layout_width="16dp"
                    android:layout_height="16dp">
                    <ImageView
                        android:id="@+id/halo_0"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_halo"
                        android:visibility="gone" />
                    <ImageView
                        android:id="@+id/dot_0"
                        android:layout_width="10dp"
                        android:layout_height="10dp"
                        android:layout_gravity="center"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_dot_empty" />
                </FrameLayout>
                <TextView
                    android:id="@+id/label_0"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:maxLines="1"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:gravity="center_vertical"
                android:orientation="horizontal">
                <TextView
                    android:layout_width="60dp"
                    android:layout_height="wrap_content"
                    android:text="Dhuhr"
                    android:textColor="@color/widget_text"
                    android:textSize="12sp" />
                <FrameLayout
                    android:layout_width="16dp"
                    android:layout_height="16dp">
                    <ImageView
                        android:id="@+id/halo_1"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_halo"
                        android:visibility="gone" />
                    <ImageView
                        android:id="@+id/dot_1"
                        android:layout_width="10dp"
                        android:layout_height="10dp"
                        android:layout_gravity="center"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_dot_empty" />
                </FrameLayout>
                <TextView
                    android:id="@+id/label_1"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:maxLines="1"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:gravity="center_vertical"
                android:orientation="horizontal">
                <TextView
                    android:layout_width="60dp"
                    android:layout_height="wrap_content"
                    android:text="Asar"
                    android:textColor="@color/widget_text"
                    android:textSize="12sp" />
                <FrameLayout
                    android:layout_width="16dp"
                    android:layout_height="16dp">
                    <ImageView
                        android:id="@+id/halo_2"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_halo"
                        android:visibility="gone" />
                    <ImageView
                        android:id="@+id/dot_2"
                        android:layout_width="10dp"
                        android:layout_height="10dp"
                        android:layout_gravity="center"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_dot_empty" />
                </FrameLayout>
                <TextView
                    android:id="@+id/label_2"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:maxLines="1"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:gravity="center_vertical"
                android:orientation="horizontal">
                <TextView
                    android:layout_width="60dp"
                    android:layout_height="wrap_content"
                    android:text="Maghrib"
                    android:textColor="@color/widget_text"
                    android:textSize="12sp" />
                <FrameLayout
                    android:layout_width="16dp"
                    android:layout_height="16dp">
                    <ImageView
                        android:id="@+id/halo_3"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_halo"
                        android:visibility="gone" />
                    <ImageView
                        android:id="@+id/dot_3"
                        android:layout_width="10dp"
                        android:layout_height="10dp"
                        android:layout_gravity="center"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_dot_empty" />
                </FrameLayout>
                <TextView
                    android:id="@+id/label_3"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:maxLines="1"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                android:gravity="center_vertical"
                android:orientation="horizontal">
                <TextView
                    android:layout_width="60dp"
                    android:layout_height="wrap_content"
                    android:text="Isha"
                    android:textColor="@color/widget_text"
                    android:textSize="12sp" />
                <FrameLayout
                    android:layout_width="16dp"
                    android:layout_height="16dp">
                    <ImageView
                        android:id="@+id/halo_4"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_halo"
                        android:visibility="gone" />
                    <ImageView
                        android:id="@+id/dot_4"
                        android:layout_width="10dp"
                        android:layout_height="10dp"
                        android:layout_gravity="center"
                        android:importantForAccessibility="no"
                        android:src="@drawable/widget_dot_empty" />
                </FrameLayout>
                <TextView
                    android:id="@+id/label_4"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="6dp"
                    android:maxLines="1"
                    android:textColor="@color/widget_text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>
        </LinearLayout>
    </LinearLayout>
</FrameLayout>
```

- [ ] **Step 6: Write the provider info**

Create `android/app/src/main/res/xml/salah_streak_widget_info.xml`. The `minResize` values follow the cell formula `70 * n - 30` dp. The maximum values are a little larger than 4x2, because launcher cell sizes are different on each device.

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description"
    android:initialLayout="@layout/widget_small"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:minResizeWidth="110dp"
    android:minResizeHeight="110dp"
    android:maxResizeWidth="320dp"
    android:maxResizeHeight="180dp"
    android:previewLayout="@layout/widget_small"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen" />
```

- [ ] **Step 7: Write the plugin**

Create `android/app/src/main/java/com/mysalahapp/app/WidgetBridgePlugin.java`:

```java
package com.mysalahapp.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    static final String SNAPSHOT_KEY = "snapshot";
    private static final String PREFS_NAME = "salah_widget";

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }

        Context context = getContext();
        prefs(context).edit().putString(SNAPSHOT_KEY, json).apply();
        SalahStreakWidgetProvider.refreshAll(context);
        call.resolve();
    }
}
```

- [ ] **Step 8: Write the provider**

Create `android/app/src/main/java/com/mysalahapp/app/SalahStreakWidgetProvider.java`:

```java
package com.mysalahapp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;
import androidx.annotation.Nullable;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SalahStreakWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "SalahStreakWidget";
    private static final String ACTION_MIDNIGHT = "com.mysalahapp.app.action.WIDGET_MIDNIGHT";
    private static final int SUPPORTED_VERSION = 1;
    private static final float MEDIUM_MIN_WIDTH_DP = 250f;
    private static final int BROKEN_COUNT_COLOR = 0xFF8E8E93;

    private static final int[] DOT_IDS = { R.id.dot_0, R.id.dot_1, R.id.dot_2, R.id.dot_3, R.id.dot_4 };
    private static final int[] HALO_IDS = { R.id.halo_0, R.id.halo_1, R.id.halo_2, R.id.halo_3, R.id.halo_4 };
    private static final int[] LABEL_IDS = { R.id.label_0, R.id.label_1, R.id.label_2, R.id.label_3, R.id.label_4 };

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, SalahStreakWidgetProvider.class));
        if (ids.length == 0) return;

        for (int id : ids) {
            updateWidget(context, manager, id);
        }
        scheduleMidnightRefresh(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
        scheduleMidnightRefresh(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        updateWidget(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (
            ACTION_MIDNIGHT.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_BOOT_COMPLETED.equals(action)
        ) {
            refreshAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager != null) {
            alarmManager.cancel(midnightIntent(context));
        }
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        JSONObject entry = readEntry(context, today());
        RemoteViews views;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> layouts = new HashMap<>();
            layouts.put(new SizeF(110f, 110f), buildViews(context, R.layout.widget_small, entry, false));
            layouts.put(new SizeF(MEDIUM_MIN_WIDTH_DP, 110f), buildViews(context, R.layout.widget_medium, entry, true));
            views = new RemoteViews(layouts);
        } else {
            int minWidth = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
            boolean medium = minWidth >= MEDIUM_MIN_WIDTH_DP;
            views = buildViews(context, medium ? R.layout.widget_medium : R.layout.widget_small, entry, medium);
        }

        manager.updateAppWidget(id, views);
    }

    @Nullable
    private static JSONObject readEntry(Context context, String today) {
        String json = WidgetBridgePlugin.prefs(context).getString(WidgetBridgePlugin.SNAPSHOT_KEY, null);
        if (json == null) return null;

        try {
            JSONObject snapshot = new JSONObject(json);
            if (snapshot.optInt("version") != SUPPORTED_VERSION) return null;

            JSONArray entries = snapshot.getJSONArray("entries");
            String[] dates = new String[entries.length()];
            for (int i = 0; i < entries.length(); i++) {
                dates[i] = entries.getJSONObject(i).getString("date");
            }

            int index = WidgetEntrySelector.select(dates, today);
            return index == -1 ? null : entries.getJSONObject(index);
        } catch (JSONException e) {
            Log.w(TAG, "The widget snapshot is not valid", e);
            return null;
        }
    }

    private static RemoteViews buildViews(Context context, int layout, @Nullable JSONObject entry, boolean medium) {
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));

        if (entry == null) {
            views.setViewVisibility(R.id.widget_content, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            return views;
        }

        views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_empty, View.GONE);

        JSONArray salah = entry.optJSONArray("salah");
        boolean brokenToday = false;

        for (int i = 0; i < DOT_IDS.length; i++) {
            String status = statusAt(salah, i);
            if (status.equals("late") || status.equals("missed")) brokenToday = true;

            views.setImageViewResource(DOT_IDS[i], status.isEmpty() ? R.drawable.widget_dot_empty : R.drawable.widget_dot_filled);
            views.setInt(DOT_IDS[i], "setColorFilter", statusColor(status));

            if (medium) {
                views.setTextViewText(LABEL_IDS[i], statusLabel(status));
                views.setViewVisibility(HALO_IDS[i], showsHalo(status) ? View.VISIBLE : View.GONE);
            }
        }

        views.setTextViewText(R.id.widget_streak_count, String.valueOf(entry.optInt("streak")));
        if (brokenToday) {
            views.setTextColor(R.id.widget_streak_count, BROKEN_COUNT_COLOR);
        }
        return views;
    }

    private static String statusAt(@Nullable JSONArray salah, int index) {
        if (salah == null) return "";
        JSONObject item = salah.optJSONObject(index);
        return item == null ? "" : item.optString("status", "");
    }

    // Copied from salahStatusColorsHexCodes in src/utils/constants.tsx.
    private static int statusColor(String status) {
        switch (status) {
            case "group":
            case "male-alone":
            case "female-alone":
                return 0xFF5FAE82;
            case "excused":
                return 0xFF8C4FB5;
            case "late":
                return 0xFFE5B233;
            case "missed":
                return 0xFFE5484D;
            default:
                return 0xFF585858;
        }
    }

    // Copied from the labels in src/components/BottomSheets/BottomSheetSingleDateView.tsx.
    private static String statusLabel(String status) {
        switch (status) {
            case "group":
                return "In Jamaah";
            case "male-alone":
                return "On Time";
            case "female-alone":
                return "Prayed";
            case "late":
                return "Late";
            case "missed":
                return "Missed";
            case "excused":
                return "Excused";
            default:
                return "—";
        }
    }

    // The same rule as showsSalahHalo in src/utils/constants.tsx.
    private static boolean showsHalo(String status) {
        return status.equals("group") || status.equals("female-alone");
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent midnightIntent(Context context) {
        Intent intent = new Intent(context, SalahStreakWidgetProvider.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // set() with RTC is inexact, so the app needs no exact-alarm permission. A few
    // minutes of delay after midnight is acceptable for a streak count.
    private static void scheduleMidnightRefresh(Context context) {
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager == null) return;

        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        alarmManager.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(context));
    }
}
```

- [ ] **Step 9: Register the receiver and the plugin**

In `android/app/src/main/AndroidManifest.xml`, add this permission after the `ACCESS_BACKGROUND_LOCATION` permission:

```xml
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

Add this receiver inside `<application>`, after the `<provider>` element:

```xml
        <receiver
            android:name=".SalahStreakWidgetProvider"
            android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/salah_streak_widget_info" />
        </receiver>
```

In `android/app/src/main/java/com/mysalahapp/app/MainActivity.java`, add this line after `registerPlugin(CurrentLocationSyncPlugin.class);`:

```java
        registerPlugin(WidgetBridgePlugin.class);
```

- [ ] **Step 10: Build the app and run the unit test**

Run: `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew :app:assembleDebug :app:testDebugUnitTest --tests com.mysalahapp.app.WidgetEntrySelectorTest`
Expected: `BUILD SUCCESSFUL`. If AAPT reports an error in a laurel drawable, open the generated file and compare its `pathData` with `src/pages/HomePage.tsx`.

- [ ] **Step 11: Commit**

```bash
git add android/app/src/main
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat(android): add the salah streak home-screen widget"
```

---

### Task 6: iOS plugin and bridge view controller

**Files:**
- Create: `ios/App/App/WidgetBridgePlugin.swift`
- Create: `ios/App/App/MainViewController.swift`
- Modify: `ios/App/App/Base.lproj/Main.storyboard:14`

**Interfaces:**
- Produces: the JS plugin `WidgetBridge` with `update({ json })`, which Task 3 calls. The plugin writes the key `widgetSnapshot` in the App Group `group.com.mysalahapp.app`, which Task 7 reads.

These files import `Capacitor`, which comes from CocoaPods. They cannot compile on this machine. Task 7 adds them to the `App` target.

- [ ] **Step 1: Write the plugin**

Create `ios/App/App/WidgetBridgePlugin.swift`:

```swift
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    // Keep these values the same as SnapshotStore in the SalahStreakWidget target.
    private static let appGroup = "group.com.mysalahapp.app"
    private static let snapshotKey = "widgetSnapshot"

    @objc func update(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("The App Group \(Self.appGroup) is not available")
            return
        }

        defaults.set(json, forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
```

- [ ] **Step 2: Write the bridge view controller**

Create `ios/App/App/MainViewController.swift`:

```swift
import Capacitor

// Capacitor registers plugins in the app target only through a bridge view controller subclass.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
```

- [ ] **Step 3: Point the storyboard to the subclass**

Run:

```bash
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' ios/App/App/Base.lproj/Main.storyboard
grep -n 'customClass' ios/App/App/Base.lproj/Main.storyboard
```

Expected: one line, `customClass="MainViewController" customModule="App" customModuleProvider="target"`.

- [ ] **Step 4: Commit**

```bash
git add ios/App/App/WidgetBridgePlugin.swift ios/App/App/MainViewController.swift ios/App/App/Base.lproj/Main.storyboard
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat(ios): add the WidgetBridge plugin"
```

---

### Task 7: iOS widget extension

**Files:**
- Xcode creates: the `SalahStreakWidgetExtension` target, `ios/App/SalahStreakWidget/` (template files, `Info.plist`, `Assets.xcassets`), the entitlements files, and the changes to `ios/App/App.xcodeproj/project.pbxproj`
- Create or overwrite in `ios/App/SalahStreakWidget/`: `WidgetSnapshot.swift`, `Provider.swift`, `WidgetStyle.swift`, `SmallView.swift`, `MediumView.swift`, `SalahStreakWidget.swift`, `SalahStreakWidgetBundle.swift`
- Create: `ios/App/SalahStreakWidget/Assets.xcassets/LaurelLeft.imageset/`, `ios/App/SalahStreakWidget/Assets.xcassets/LaurelRight.imageset/`

**Interfaces:**
- Consumes: the App Group key `widgetSnapshot` from Task 6. The JSON shape from Task 2.
- Produces: `SnapshotStore.decode(_:)`, `SnapshotStore.entry(on:in:)`, `SnapshotStore.dayString(_:calendar:)`, `SnapshotStore.startOfDay(_:calendar:)`.

- [ ] **Step 1: Ask the user to create the target in Xcode, and wait**

Stop and send the user these instructions. Continue only after the user confirms that they finished all of them.

1. Run `open ios/App/App.xcodeproj`. Xcode can show a warning about the missing Pods. You can ignore it for these steps.
2. Select File > New > Target > iOS > Widget Extension, then click Next.
3. Set Product Name to `SalahStreakWidget`. Clear "Include Live Activity", "Include Control", and "Include Configuration App Intent". Set "Embed in Application" to `App`. Click Finish. If Xcode asks to activate the scheme, click Activate.
4. Select the `SalahStreakWidgetExtension` target. In General, set Minimum Deployments to iOS 15.0. In Build Settings, set Swift Language Version to Swift 5.
5. Check that the bundle ID of the widget target is `com.mysalahapp.app.SalahStreakWidget`.
6. Select the `App` target. In Signing & Capabilities, click + Capability, add App Groups, and add `group.com.mysalahapp.app`.
7. Select the `SalahStreakWidgetExtension` target. In Signing & Capabilities, add App Groups, and select the same group.
8. Drag `ios/App/App/WidgetBridgePlugin.swift` and `ios/App/App/MainViewController.swift` into the `App` group in the project navigator. Select only the `App` target. Do not select the widget target.
9. Quit Xcode, so that Xcode saves `project.pbxproj`.

- [ ] **Step 2: Check what Xcode created**

Run:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -list -project ios/App/App.xcodeproj
ls ios/App/SalahStreakWidget
grep -rl "group.com.mysalahapp.app" ios/App --include=*.entitlements
grep -c PBXFileSystemSynchronizedRootGroup ios/App/App.xcodeproj/project.pbxproj
```

Expected:
- The target list has `App` and `SalahStreakWidgetExtension`.
- The folder has `SalahStreakWidget.swift`, `SalahStreakWidgetBundle.swift`, `Assets.xcassets`, and `Info.plist`.
- Two `.entitlements` files contain the App Group.

If the last count is greater than 0, Xcode uses a synchronized folder, and new files in `ios/App/SalahStreakWidget/` join the target without more steps. If the count is 0, Step 9 must ask the user to add the new Swift files to the widget target.

- [ ] **Step 3: Write the snapshot model and store**

Create `ios/App/SalahStreakWidget/WidgetSnapshot.swift`:

```swift
import Foundation

struct WidgetSnapshot: Decodable {
    static let supportedVersion = 1

    let version: Int
    let entries: [Entry]

    struct Entry: Decodable {
        let date: String
        let streak: Int
        let salah: [Salah]
    }

    struct Salah: Decodable {
        let name: String
        let status: String
    }
}

enum SnapshotStore {
    // Keep these values the same as WidgetBridgePlugin in the App target.
    static let appGroup = "group.com.mysalahapp.app"
    static let snapshotKey = "widgetSnapshot"

    static func load() -> WidgetSnapshot? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey) else { return nil }
        return decode(json)
    }

    static func decode(_ json: String) -> WidgetSnapshot? {
        guard
            let data = json.data(using: .utf8),
            let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
            snapshot.version == WidgetSnapshot.supportedVersion
        else { return nil }
        return snapshot
    }

    // Dates are "yyyy-MM-dd", so string order is date order.
    static func entry(on day: String, in snapshot: WidgetSnapshot?) -> WidgetSnapshot.Entry? {
        snapshot?.entries.filter { $0.date <= day }.max { $0.date < $1.date }
    }

    static func dayString(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    static func startOfDay(_ day: String, calendar: Calendar = .current) -> Date? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }
}
```

- [ ] **Step 4: Check the store on macOS**

Run:

```bash
mkdir -p "$TMPDIR/salah-widget-check"
cat > "$TMPDIR/salah-widget-check/main.swift" <<'EOF'
import Foundation

func check(_ ok: Bool, _ message: String) {
    if !ok { print("FAIL: \(message)"); exit(1) }
}

let json = #"{"version":1,"generatedAt":"2026-10-10T15:00:00.000Z","entries":[{"date":"2026-10-10","streak":4,"salah":[]},{"date":"2026-10-11","streak":4,"salah":[]},{"date":"2026-10-12","streak":0,"salah":[]}]}"#
let snapshot = SnapshotStore.decode(json)
check(snapshot != nil, "decodes a valid snapshot")
check(SnapshotStore.entry(on: "2026-10-10", in: snapshot)?.date == "2026-10-10", "selects today")
check(SnapshotStore.entry(on: "2026-10-11", in: snapshot)?.date == "2026-10-11", "selects tomorrow")
check(SnapshotStore.entry(on: "2026-11-01", in: snapshot)?.date == "2026-10-12", "keeps the last entry")
check(SnapshotStore.entry(on: "2026-10-09", in: snapshot) == nil, "is empty before the first entry")
check(SnapshotStore.decode(json.replacingOccurrences(of: "\"version\":1", with: "\"version\":2")) == nil, "rejects an unknown version")
check(SnapshotStore.decode("not json") == nil, "rejects JSON that is not valid")
check(SnapshotStore.dayString(SnapshotStore.startOfDay("2026-03-29")!) == "2026-03-29", "keeps the day across a DST change")
print("PASS")
EOF
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swiftc -o "$TMPDIR/salah-widget-check/check" ios/App/SalahStreakWidget/WidgetSnapshot.swift "$TMPDIR/salah-widget-check/main.swift" && "$TMPDIR/salah-widget-check/check"
```

Expected: `PASS`.

- [ ] **Step 5: Write the timeline provider**

Create `ios/App/SalahStreakWidget/Provider.swift`:

```swift
import WidgetKit

struct StreakEntry: TimelineEntry {
    let date: Date
    let day: WidgetSnapshot.Entry?
}

extension WidgetSnapshot.Entry {
    static let preview = WidgetSnapshot.Entry(
        date: "2026-10-10",
        streak: 12,
        salah: [
            .init(name: "Fajr", status: "group"),
            .init(name: "Dhuhr", status: "male-alone"),
            .init(name: "Asar", status: "late"),
            .init(name: "Maghrib", status: ""),
            .init(name: "Isha", status: ""),
        ]
    )
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), day: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        let now = Date()
        completion(StreakEntry(date: now, day: SnapshotStore.entry(on: SnapshotStore.dayString(now), in: SnapshotStore.load())))
    }

    // The later entries start at local midnight, so the widget rolls over without the app.
    // The app reloads the timeline after each change, so the policy is .never.
    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let snapshot = SnapshotStore.load()
        let now = Date()
        var entries = [StreakEntry(date: now, day: SnapshotStore.entry(on: SnapshotStore.dayString(now), in: snapshot))]

        for day in snapshot?.entries ?? [] {
            if let start = SnapshotStore.startOfDay(day.date), start > now {
                entries.append(StreakEntry(date: start, day: day))
            }
        }

        entries.sort { $0.date < $1.date }
        completion(Timeline(entries: entries, policy: .never))
    }
}
```

- [ ] **Step 6: Write the shared styles and views**

Create `ios/App/SalahStreakWidget/WidgetStyle.swift`:

```swift
import SwiftUI
import WidgetKit

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

enum WidgetColors {
    static let secondaryText = Color(hex: 0x8E8E93)
    static let halo = Color(hex: 0xF2C94C)

    static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x1B1B1C) : Color(hex: 0xF7F7F7)
    }

    static func text(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : .black
    }

    static func wreath(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xE9E9E9) : .black
    }
}

enum SalahStatusStyle {
    // Copied from salahStatusColorsHexCodes in src/utils/constants.tsx.
    static func color(_ status: String) -> Color {
        switch status {
        case "group", "male-alone", "female-alone": return Color(hex: 0x5FAE82)
        case "excused": return Color(hex: 0x8C4FB5)
        case "late": return Color(hex: 0xE5B233)
        case "missed": return Color(hex: 0xE5484D)
        default: return Color(hex: 0x585858)
        }
    }

    // Copied from the labels in src/components/BottomSheets/BottomSheetSingleDateView.tsx.
    static func label(_ status: String) -> String {
        switch status {
        case "group": return "In Jamaah"
        case "male-alone": return "On Time"
        case "female-alone": return "Prayed"
        case "late": return "Late"
        case "missed": return "Missed"
        case "excused": return "Excused"
        default: return "—"
        }
    }

    // The same rule as showsSalahHalo in src/utils/constants.tsx.
    static func showsHalo(_ status: String) -> Bool {
        status == "group" || status == "female-alone"
    }

    static func breaksStreakToday(_ status: String) -> Bool {
        status == "late" || status == "missed"
    }
}

struct SalahDot: View {
    let status: String
    var size: CGFloat = 12
    var showsHalo = false

    var body: some View {
        ZStack {
            if status.isEmpty {
                Circle().stroke(SalahStatusStyle.color(status), lineWidth: 1.5)
            } else {
                Circle().fill(SalahStatusStyle.color(status))
            }
            if showsHalo && SalahStatusStyle.showsHalo(status) {
                Circle().stroke(WidgetColors.halo, lineWidth: 1.5).padding(-3)
            }
        }
        .frame(width: size, height: size)
    }
}

struct StreakCountView: View {
    @Environment(\.colorScheme) private var colorScheme
    let day: WidgetSnapshot.Entry

    private var brokenToday: Bool {
        day.salah.contains { SalahStatusStyle.breaksStreakToday($0.status) }
    }

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Image("LaurelLeft").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 25)
                Text("\(day.streak)")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundColor(brokenToday ? WidgetColors.secondaryText : WidgetColors.text(colorScheme))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                Image("LaurelRight").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 25)
            }
            .foregroundColor(WidgetColors.wreath(colorScheme))

            Text("day streak")
                .font(.caption2)
                .foregroundColor(WidgetColors.secondaryText)
        }
    }
}

struct EmptyStateView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text("Open My Salah App to start your streak")
            .font(.footnote)
            .multilineTextAlignment(.center)
            .foregroundColor(WidgetColors.text(colorScheme))
    }
}

extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            background(color)
        }
    }
}
```

Create `ios/App/SalahStreakWidget/SmallView.swift`:

```swift
import SwiftUI

struct SmallView: View {
    let day: WidgetSnapshot.Entry

    var body: some View {
        VStack(spacing: 10) {
            StreakCountView(day: day)
            HStack(spacing: 8) {
                ForEach(Array(day.salah.prefix(5).enumerated()), id: \.offset) { _, salah in
                    VStack(spacing: 3) {
                        SalahDot(status: salah.status)
                        Text(String(salah.name.prefix(1)))
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(WidgetColors.secondaryText)
                    }
                }
            }
        }
    }
}
```

Create `ios/App/SalahStreakWidget/MediumView.swift`:

```swift
import SwiftUI

struct MediumView: View {
    @Environment(\.colorScheme) private var colorScheme
    let day: WidgetSnapshot.Entry

    var body: some View {
        HStack(spacing: 16) {
            StreakCountView(day: day)
                .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 5) {
                ForEach(Array(day.salah.prefix(5).enumerated()), id: \.offset) { _, salah in
                    HStack(spacing: 8) {
                        Text(salah.name)
                            .font(.caption)
                            .foregroundColor(WidgetColors.text(colorScheme))
                            .frame(width: 56, alignment: .leading)
                        SalahDot(status: salah.status, size: 10, showsHalo: true)
                        Text(SalahStatusStyle.label(salah.status))
                            .font(.caption)
                            .foregroundColor(WidgetColors.secondaryText)
                            .lineLimit(1)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
```

- [ ] **Step 7: Replace the Xcode template files**

Overwrite `ios/App/SalahStreakWidget/SalahStreakWidget.swift`. This replaces the template provider and views that Xcode generated.

```swift
import SwiftUI
import WidgetKit

struct SalahStreakWidget: Widget {
    let kind = "SalahStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SalahStreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Salah Streak")
        .description("Your current streak and today's salah.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SalahStreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    let entry: StreakEntry

    var body: some View {
        Group {
            if let day = entry.day {
                if family == .systemMedium {
                    MediumView(day: day)
                } else {
                    SmallView(day: day)
                }
            } else {
                EmptyStateView()
            }
        }
        .widgetBackground(WidgetColors.background(colorScheme))
    }
}
```

Overwrite `ios/App/SalahStreakWidget/SalahStreakWidgetBundle.swift`:

```swift
import SwiftUI
import WidgetKit

@main
struct SalahStreakWidgetBundle: WidgetBundle {
    var body: some Widget {
        SalahStreakWidget()
    }
}
```

- [ ] **Step 8: Generate the laurel image sets from the home-page artwork**

Run this script from the repository root:

```bash
node --input-type=module <<'EOF'
import fs from "node:fs";
const src = fs.readFileSync("src/pages/HomePage.tsx", "utf8");
const paths = (viewBox) => {
  const start = src.indexOf(`viewBox="${viewBox}"`);
  if (start === -1) throw new Error(`viewBox ${viewBox} not found`);
  const end = src.indexOf("</svg>", start);
  const found = [...src.slice(start, end).matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  if (found.length !== 2) throw new Error(`expected 2 paths for ${viewBox}, found ${found.length}`);
  return found;
};
const svg = (width, d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="547" viewBox="0 0 ${width} 547">\n` +
  d.map((p) => `  <path d="${p}" fill="#000000"/>`).join("\n") +
  `\n</svg>\n`;
const contents = (file) =>
  JSON.stringify(
    {
      images: [{ filename: file, idiom: "universal" }],
      info: { author: "xcode", version: 1 },
      properties: { "preserves-vector-representation": true, "template-rendering-intent": "template" },
    },
    null,
    2,
  ) + "\n";
const write = (set, file, width, viewBox) => {
  const dir = `ios/App/SalahStreakWidget/Assets.xcassets/${set}.imageset`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${file}`, svg(width, paths(viewBox)));
  fs.writeFileSync(`${dir}/Contents.json`, contents(file));
};
write("LaurelLeft", "laurel-left.svg", 351, "0 0 351 547");
write("LaurelRight", "laurel-right.svg", 352, "0 0 352 547");
console.log("wrote LaurelLeft and LaurelRight image sets");
EOF
```

Expected: `wrote LaurelLeft and LaurelRight image sets`.

- [ ] **Step 9: Build the widget target**

If Step 2 found no synchronized folder, first ask the user to drag `WidgetSnapshot.swift`, `Provider.swift`, `WidgetStyle.swift`, `SmallView.swift`, and `MediumView.swift` into the `SalahStreakWidget` group, with only the `SalahStreakWidgetExtension` target selected. Wait for the user to confirm.

Run:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ios/App/App.xcodeproj -target SalahStreakWidgetExtension -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build 2>&1 | tail -20
```

Expected: `** BUILD SUCCEEDED **`. If the build reports `cannot find 'Provider' in scope` or a similar error, a file is not in the target. Ask the user to add it, as described above.

- [ ] **Step 10: Commit**

```bash
git add ios/App/SalahStreakWidget ios/App/App.xcodeproj/project.pbxproj ios/App/App
git status --short ios
GIT_COMMITTER_NAME="Jackson Coakley" GIT_COMMITTER_EMAIL="6051613+hacktastic@users.noreply.github.com" git commit --author="Jackson Coakley <6051613+hacktastic@users.noreply.github.com>" -m "feat(ios): add the salah streak widget extension"
```

Check that `git status --short ios` shows no other new files. Xcode can put the widget entitlements file in `ios/App/SalahStreakWidget/` or in `ios/App/`. If the file is in `ios/App/`, add it before the commit.

---

### Task 8: Final verification

**Files:** none changed, unless a check fails.

- [ ] **Step 1: Run the automated checks**

Run each command and compare the result with the baseline in Global Constraints:

```bash
npx tsc --noEmit
npm run lint 2>&1 | grep problems
npx vitest run src/utils
npx vitest run 2>&1 | tail -6
```

Expected:
- `tsc` exits with code 0.
- Lint reports `31 errors` or fewer.
- All test files in `src/utils` pass.
- In the full run, the only failures are the render tests that already failed on `main`. Report the count.

- [ ] **Step 2: Build the Android app one more time**

Run: `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew :app:assembleDebug`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Give the user the device checklist**

This machine has no Android emulator, and CocoaPods is not installed. The user must run these checks on devices:

- **Android:**
  - Install the debug APK: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
  - Add the widget, and resize it from 2x2 to 4x2.
  - Log a salah, and check that the widget updates.
  - Set the device clock to 23:59, wait for midnight, and check the rollover.
  - Switch the system dark mode, and check the colors.
- **iOS:**
  - Install CocoaPods, run `npx cap sync ios`, and run the app on a simulator.
  - Add the small and the medium widget.
  - Log a salah, and check that the widget updates.
  - Change the simulator date to the next day, and check the rollover.
- **Both platforms:**
  - Check that the widget count equals the wreath count on the home page.
  - Check that the widget shows `Open My Salah App to start your streak` before onboarding.
