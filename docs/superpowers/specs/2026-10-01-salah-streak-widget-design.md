# Salah streak home-screen widget: design

Date: 2026-10-01
Status: approved in chat, waiting for spec review

## 1. Goal

Users ask most often for a home-screen widget that shows their salah streak. This design adds a
read-only widget on iOS and Android. The widget shows the current streak and the five salah statuses
for today. A tap on the widget opens the app.

### Success criteria

- The widget count is the same as the wreath count on the home page (`src/pages/HomePage.tsx:130-193`).
- The widget updates after each salah log.
- The widget shows the correct values after local midnight, also when the app stays closed.
- iOS has a small (2x2) widget and a medium (4x2) widget.
- Android has one widget that resizes from 2x1 to 4x2. The default size is 2x2.

### Out of scope

- Lock-screen widgets.
- Logging a salah from the widget.
- A deep link that opens one salah.
- A longest-streak value.
- Localization. The text is English only, because the app has no localization now.

## 2. Architecture: a precomputed snapshot

The app is the only writer of salah data. The TypeScript code calculates a small JSON snapshot and
sends it to native shared storage. The native widgets read the snapshot, select one entry, and draw
it. The native widgets contain no streak rules, so the rules exist in one place and the tests cover
them.

```
salah log ──► SQLite ──► App.tsx state ──► buildWidgetSnapshot() ──► WidgetBridge.update(json)
                                                                        │
                                  ┌─────────────────────────────────────┴──────────────┐
                                  ▼                                                    ▼
             iOS: App Group UserDefaults ──► WidgetKit       Android: SharedPreferences ──► AppWidgetProvider
```

### 2.1 Streak module

Move `generateStreaks` and `handleEndOfStreak` from `src/App.tsx:903-1039` into a new file,
`src/utils/streaks.ts`. The new file exports pure functions, for example `computeStreaks(days, today)`.
The function returns the active streak count and the list of streak periods. `App.tsx` calls the new
module and keeps its own state setters (`setActiveStreakCount`, `setStreakDatesObjectsArr`).

The move keeps the current rules:

- A day adds to the streak only when all five salah have a status.
- `missed`, `late`, and an empty slot break the streak.
- `group`, `male-alone`, and `female-alone` add to the streak.
- An `excused` day pauses the streak. A day with one or more `excused` salah and no breaking status
  does not break the streak and does not add to it.
- An incomplete today does not break the streak. The streak through yesterday stays active.
- `late` or `missed` today sets the streak to 0 at once.
- Today adds to the count only when all five salah have a status.
- Records before `userStartDate` have no effect.

The move also fixes two bugs:

- `generateStreaks` calls `.reverse()` on its input, and this changes the array in place. The call at
  `BottomSheetSalahStatus.tsx:253` passes the live state array. The new function does not change its
  input.
- When no streak period exists, the old code does not call `setActiveStreakCount`, so the old value
  stays. The new code returns 0, and `App.tsx` sets 0.

### 2.2 Snapshot contract

A new file, `src/utils/widgetSnapshot.ts`, defines the type and the builder
`buildWidgetSnapshot(days, today)`:

```ts
type WidgetSnapshot = {
  version: 1;
  generatedAt: string; // ISO 8601 timestamp
  entries: Array<{
    date: string;      // "yyyy-MM-dd"; the entry applies from local midnight of this date
    streak: number;
    salah: Array<{ name: SalahName; status: SalahStatus | "" }>; // always 5, Fajr..Isha
  }>;                  // exactly 3 entries: [today, today+1, today+2]
};
```

Rules for the entries:

- **Today:** `streak` is the active streak count. `salah` has the five statuses for today.
- **Today+1:** the builder adds one empty day and runs `computeStreaks` with `today + 1`. `salah` has
  five empty statuses. This entry is correct if the user logs nothing more before midnight.
- **Today+2:** `streak` is always 0, because a day with no logs (today+1) breaks the streak. `salah`
  has five empty statuses.
- `salah` always has five slots in the order Fajr, Dhuhr, Asar, Maghrib, Isha. The stored name is
  `Asar`, as in `src/utils/constants.tsx:144-150`. The widgets show the label "Asr", as the app does in
  `SalahTable.tsx:354`.

Native selection rule: the widget shows the entry with the latest `date` that is today or earlier, in
local time. After today+2, the widget keeps the today+2 entry.

Empty state: the widget shows "Open My Salah App to start your streak" in these cases:

- There is no snapshot, for example before onboarding.
- The JSON is not valid.
- The `version` is not 1.
- No entry has a `date` that is today or earlier.

### 2.3 Sync from the app

A new file, `src/utils/widgetSync.ts`, registers the plugin with `registerPlugin("WidgetBridge")` and
exports `syncWidget(snapshot)`. The function calls `WidgetBridge.update({ json })`.

- On web, the function does nothing.
- The function catches all plugin errors and logs them. A widget failure never blocks a salah log.

An effect in `App.tsx` calls `syncWidget`. The effect is next to the `syncBackgroundState` effect at
`App.tsx:549-563`. The effect runs when the salah data or the streak state changes. This covers these
write paths:

- `addOrModifySalah` (`BottomSheetSalahStatus.tsx:154-259`).
- `executeBatchUpdate` (`BottomSheetBatchUpdate.tsx:97-190`).
- A DB import (`SettingsPage.tsx:203-208`).
- A start-date change (`BottomSheetStartDate.tsx:50-66`).
- The first launch and an app resume on a new day (`App.tsx:199-201`, `App.tsx:340`).

The effect also runs on app resume.

## 3. iOS

### 3.1 App Group and signing

- Add the App Group `group.com.mysalahapp.app` to the `App` target and to the new widget target.
- Add an `.entitlements` file to each target.
- The developer registers the App Group and the bundle ID `com.mysalahapp.app.SalahStreakWidget` for
  team `UU8AX6N45F`. Automatic signing can do most of this.

### 3.2 Plugin

- Add `ios/App/App/WidgetBridgePlugin.swift`, a `CAPPlugin` with one method, `update(json)`.
  - The method writes the JSON string to `UserDefaults(suiteName: "group.com.mysalahapp.app")` with
    the key `widgetSnapshot`.
  - Then the method calls `WidgetCenter.shared.reloadAllTimelines()`.
- Capacitor 8 registers a local plugin only through a subclass of the bridge view controller. Add
  `ios/App/App/MainViewController.swift`, a subclass of `CAPBridgeViewController`. Its
  `capacitorDidLoad()` calls `bridge?.registerPluginInstance(WidgetBridgePlugin())`.
- Change `ios/App/App/Base.lproj/Main.storyboard:14` from
  `customClass="CAPBridgeViewController" customModule="Capacitor"` to
  `customClass="MainViewController" customModule="App"`.

### 3.3 Widget extension

- Add a new target, `SalahStreakWidget`, with SwiftUI and WidgetKit.
  - Deployment target: iOS 15.0, the same as the app.
  - Bundle ID: `com.mysalahapp.app.SalahStreakWidget`.
  - The target uses no pods, so the `Podfile` does not change.
- The developer adds the target with "Add Target" in Xcode. `project.pbxproj` uses
  `objectVersion = 48`, and Xcode is the safe way to change this file. Commit the generated changes.
- Files in the target:
  - `SnapshotStore.swift`: decodes `WidgetSnapshot` with `Codable`, and applies the selection rule
    and the empty-state rule from section 2.2.
  - `Provider.swift`: a `TimelineProvider`. It uses `SnapshotStore.timeline`, which returns one entry
    for each snapshot entry, at local midnight of the entry `date`. The reload policy is
    `.after(now + 1 hour)`. Timeline dates are absolute, so the hourly rebuild applies a clock or
    time-zone change within an hour, also when the app does not run.
  - `SalahText.swift`: the labels, the "Asr" display name, and the accessibility description. It uses
    Foundation only, so `npm run test:ios-widget` can check it on macOS.
  - `SmallView.swift` and `MediumView.swift`: the layouts from section 5.
  - `SalahStreakWidget.swift`: the `@main` widget configuration, with `.systemSmall` and
    `.systemMedium` as the supported families.
- On iOS 17 and later, the views use `containerBackground`. On iOS 15 and 16, the views use a plain
  background.
- A tap opens the app. The widget has no `widgetURL`, because the app has no URL scheme.

## 4. Android

### 4.1 Plugin

- Add `android/app/src/main/java/com/mysalahapp/app/WidgetBridgePlugin.java`. Follow the pattern of
  `CurrentLocationSyncPlugin.java`.
  - `update(json)` writes the JSON string to `SharedPreferences("salah_widget")` with the key
    `snapshot`.
  - Then it calls `SalahStreakWidgetProvider.refreshAll(context)`.
- Register the plugin in `MainActivity.java` in the same way as `CurrentLocationSyncPlugin`.

### 4.2 Provider

- Add `SalahStreakWidgetProvider.java`, a subclass of `AppWidgetProvider`. The code is Java, the same
  as the rest of the app module.
- `onUpdate` and `onAppWidgetOptionsChanged` read the snapshot with `org.json`. They apply the
  selection rule and the empty-state rule from section 2.2. Then they build the `RemoteViews`.
- Layout selection:
  - On API 31 and later, use `new RemoteViews(Map<SizeF, RemoteViews>)` with four sizes: the narrow
    row at 2x1, the wide row at 3x1, the small layout at 2x2, and the medium layout at 4x2. The
    launcher selects the largest size that fits.
  - On API 24 to 30, `WidgetLayoutSelector.select` selects the layout from
    `OPTION_APPWIDGET_MIN_WIDTH` and `OPTION_APPWIDGET_MIN_HEIGHT`. A height of 0 means that the
    launcher has not measured the widget yet, so the selector uses the default 2x2 layout.
- Each status dot is an `ImageView` with an oval drawable. Set its color with
  `setInt(id, "setColorFilter", color)`.
- A tap sends a `PendingIntent` with `FLAG_IMMUTABLE` that opens `MainActivity`.

### 4.3 Midnight rollover

Android widgets have no timeline, so the provider schedules its own refresh.

- After each refresh, the provider calls `AlarmManager.set(RTC, nextLocalMidnight, ...)` with a
  broadcast to itself. This alarm is inexact, so the app needs no exact-alarm permission.
- The provider also handles `ACTION_TIME_CHANGED`, `ACTION_TIMEZONE_CHANGED`, and
  `ACTION_BOOT_COMPLETED`. Android exempts these broadcasts from the limits on implicit broadcasts.
- Set `updatePeriodMillis="0"`, so the widget does not poll.

### 4.4 Resources

- `res/xml/salah_streak_widget_info.xml`:
  - `targetCellWidth` 2 and `targetCellHeight` 2.
  - `minResizeWidth` for 2 columns and `minResizeHeight` for 1 row (`40dp`). `maxResizeWidth` and
    `maxResizeHeight` for 4x2.
  - `resizeMode="horizontal|vertical"`.
  - `updatePeriodMillis="0"`.
  - A `previewLayout`.
- `res/layout/widget_small.xml` and `res/layout/widget_medium.xml`.
- A wreath vector drawable, converted from `src/assets/images/wreath.svg`.
- Color resources in `res/values/` and `res/values-night/`.
- A `<receiver>` in `AndroidManifest.xml`. It uses the relative class name
  `.SalahStreakWidgetProvider`, so the `.debug` application ID suffix still works.

## 5. Visual design

### 5.1 Small (2x2), both platforms

```
┌───────────────┐
│   🌿  12  🌿   │   the wreath around a large, bold count
│   day streak  │
│               │
│  ◉ ● ● ○ ○    │   five dots in the status colors; an empty slot is an outline
│  F D A M I    │   initials in small secondary text
└───────────────┘
```

- `group` and `female-alone` get the gold halo ring, as in section 5.3 (◉ above). Without the ring,
  "In Jamaah" and "On Time" have the same green and look the same.

### 5.2 One row (2x1, 3x1, 4x1), Android only

```
2x1:                    3x1 and 4x1:
┌─────────────┐         ┌──────────────────────────┐
│  🌿 12 🌿   │         │  🌿 12 🌿   ◉ ● ● ○ ○    │
└─────────────┘         └──────────────────────────┘
```

- 2x1 has room only for the wreath and the count. From 3 columns, the five dots show after the count,
  with the same colors and halo rule as the other sizes.
- The empty state on one row is "Open My Salah App", because the full text does not fit.
- iOS has no home-screen widget with one row.

### 5.3 Medium (4x2)

```
┌──────────────────────────────────────┐
│   🌿  12  🌿   │ Fajr     ● In Jamaah ✦│
│   day streak  │ Dhuhr    ● On Time    │
│               │ Asr      ● Late       │
│               │ Maghrib  ○ —          │
│               │ Isha     ○ —          │
└──────────────────────────────────────┘
```

- The right column has one row for each salah: the name, a dot, and the status label. The name of
  the third salah is "Asr".
- The labels are the same as in `BottomSheetSingleDateView.tsx:156-162`: `group` is "In Jamaah",
  `male-alone` is "On Time", `female-alone` is "Prayed", `late` is "Late", `missed` is "Missed", and
  `excused` is "Excused". An empty slot shows "—" and not "No Data", because the row has little space.
- `group` and `female-alone` get a static gold halo ring (`#f2c94c`). This is the same rule as
  `showsSalahHalo` (`src/utils/constants.tsx:108-109`). The ring does not move, because widgets cannot
  animate.

### 5.4 Colors and theme

- Dot colors come from `salahStatusColorsHexCodes` (`src/utils/constants.tsx:97-105`):
  - `group`, `male-alone`, `female-alone`: `#5FAE82`.
  - `late`: `#E5B233`. Text on this color is black.
  - `missed`: `#E5484D`.
  - `excused`: `#8C4FB5`.
  - Empty: an outline in `#585858`.
- If today has `late` or `missed`, the count shows 0 in the secondary text color. The dots still show
  the statuses for today.
- The widget follows the system light or dark mode, not the in-app theme. Both platforms draw
  home-screen widgets against the system appearance and the wallpaper.
  - Dark background: `rgb(27,27,28)`.
  - Light background: `rgb(247,247,247)`.

## 6. Accessibility and versions

- Each widget has one accessibility description for screen readers, for example "3 day streak. Fajr:
  In Jamaah. Dhuhr: On Time. Asr: Not logged. ...". The child views are hidden from screen readers.
- `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` are set at the project level, so the app and the
  widget extension always have the same version.

## 7. Error handling

- `syncWidget` catches all plugin errors and logs them. A widget failure never blocks a salah log.
- On web, `syncWidget` does nothing.
- The native readers show the empty state for a missing snapshot, JSON that is not valid, an unknown
  `version`, or no matching entry (section 2.2).

## 8. Testing

### 8.1 Automated tests (Vitest)

- `src/utils/streaks.test.ts`: characterization tests for the extracted rules.
  - All days good.
  - A `late` day and a `missed` day break the streak.
  - An `excused` day pauses the streak.
  - An incomplete today keeps the streak through yesterday.
  - `late` today gives 0 at once.
  - A start date of today.
  - Gaps with no rows break the streak.
  - The function does not change its input.
- `src/utils/widgetSnapshot.test.ts`:
  - The today+1 and today+2 entries for a complete today, an incomplete today, an excused today, and
    a broken today.
  - Each entry has five slots in the order Fajr, Dhuhr, Asar, Maghrib, Isha.
- These tests are pure logic with no render. On `main` (2026-10-01), all 28 existing Vitest tests fail
  with a render TypeError. Report the new tests separately from that baseline.

### 8.2 Android

- Build with JDK 21 in `android/`:
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew :app:assembleDebug`
- On an emulator:
  - Add the widget.
  - Resize it from 2x2 to 4x2.
  - Log salah and check that the widget updates.
  - Move the device clock past midnight and check the rollover.

### 8.3 iOS

- CocoaPods is not installed on the development machine for this work, so iOS cannot be built there.
- The developer adds the target in Xcode, runs `pod install`, and tests on a simulator.
- Use SwiftUI previews with fixed snapshots for the layout work.
- Run `npm run test:ios-widget`. It compiles the Foundation-only widget files with
  `ios/App/SalahStreakWidgetChecks/main.swift` on macOS, and runs the checks under the Gregorian,
  Islamic, Buddhist, and Japanese calendars.

### 8.4 Both platforms

- Compare the widget count with the wreath count on the home page.
