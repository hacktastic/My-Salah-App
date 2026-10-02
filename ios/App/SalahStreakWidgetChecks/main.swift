// Checks the Foundation-only widget code on macOS. Run: npm run test:ios-widget
import Foundation

var failures = 0

func check(_ ok: Bool, _ message: String) {
    print(ok ? "ok   \(message)" : "FAIL \(message)")
    if !ok { failures += 1 }
}

func calendar(_ zone: String) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: zone)!
    return calendar
}

func date(_ calendar: Calendar, _ year: Int, _ month: Int, _ day: Int, _ hour: Int = 0) -> Date {
    calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour))!
}

let json = #"{"version":1,"generatedAt":"2026-10-10T15:00:00.000Z","entries":[{"date":"2026-10-10","streak":3,"salah":[{"name":"Fajr","status":"group"},{"name":"Dhuhr","status":"male-alone"},{"name":"Asar","status":"late"},{"name":"Maghrib","status":""},{"name":"Isha","status":"excused"}]},{"date":"2026-10-11","streak":0,"salah":[]},{"date":"2026-10-12","streak":0,"salah":[]}]}"#
let snapshot = SnapshotStore.decode(json)

print("current calendar: \(Calendar.current.identifier)")

// Decode and selection
check(snapshot != nil, "decodes a valid snapshot")
check(SnapshotStore.entry(on: "2026-10-10", in: snapshot)?.date == "2026-10-10", "selects today")
check(SnapshotStore.entry(on: "2026-10-11", in: snapshot)?.date == "2026-10-11", "selects tomorrow")
check(SnapshotStore.entry(on: "2026-11-01", in: snapshot)?.date == "2026-10-12", "keeps the last entry")
check(SnapshotStore.entry(on: "2026-10-09", in: snapshot) == nil, "is empty before the first entry")
check(SnapshotStore.decode(json.replacingOccurrences(of: "\"version\":1", with: "\"version\":2")) == nil, "rejects an unknown version")
check(SnapshotStore.decode("not json") == nil, "rejects JSON that is not valid")

// The snapshot dates are Gregorian, whatever the device calendar is.
let local = SnapshotStore.gregorian
let noon = date(local, 2026, 10, 2, 12)
check(SnapshotStore.dayString(noon) == "2026-10-02", "dayString is Gregorian")
check(SnapshotStore.startOfDay("2026-10-02") == local.startOfDay(for: noon), "startOfDay is Gregorian")
check(SnapshotStore.dayString(SnapshotStore.startOfDay("2026-03-29")!) == "2026-03-29", "keeps the day across a DST change")

// Timeline
let riyadh = calendar("Asia/Riyadh")
let newYork = calendar("America/New_York")
let afternoon = date(riyadh, 2026, 10, 10, 15)
let timeline = SnapshotStore.timeline(snapshot, now: afternoon, calendar: riyadh)
check(timeline.items.map { $0.day?.date } == ["2026-10-10", "2026-10-11", "2026-10-12"], "lists today and the two later entries")
check(timeline.items.map { $0.date } == [afternoon, date(riyadh, 2026, 10, 11), date(riyadh, 2026, 10, 12)], "starts the later entries at local midnight")
check(timeline.refresh == afternoon.addingTimeInterval(SnapshotStore.refreshInterval), "refreshes after one hour")
check(timeline.refresh.timeIntervalSince(afternoon) == 3600, "the refresh interval is one hour")

let travelled = SnapshotStore.timeline(snapshot, now: afternoon, calendar: newYork)
check(travelled.items.last?.date == date(newYork, 2026, 10, 12), "uses the time zone of the calendar for midnight")
check(travelled.items.last?.date != timeline.items.last?.date, "a time-zone change moves the midnight entries")

let setBack = SnapshotStore.timeline(snapshot, now: date(riyadh, 2026, 10, 9, 15), calendar: riyadh)
check(setBack.items.first?.day == nil, "shows the empty state when the clock is before the first entry")
check(setBack.items.map { $0.day?.date }.dropFirst().elementsEqual(["2026-10-10", "2026-10-11", "2026-10-12"]), "keeps all entries when the clock is set back")

let empty = SnapshotStore.timeline(nil, now: afternoon, calendar: riyadh)
check(empty.items.count == 1 && empty.items[0].day == nil, "shows the empty state with no snapshot")

// Text
check(SalahText.displayName("Asar") == "Asr", "shows Asr for the stored name Asar")
check(SalahText.label("female-alone") == "Prayed" && SalahText.label("") == "—", "uses the app labels")
check(
    SalahText.accessibilityDescription(snapshot!.entries[0])
        == "3 day streak. Fajr: In Jamaah. Dhuhr: On Time. Asr: Late. Maghrib: Not logged. Isha: Excused.",
    "describes the streak and every salah"
)

print(failures == 0 ? "PASS" : "\(failures) FAILED")
exit(failures == 0 ? 0 : 1)
