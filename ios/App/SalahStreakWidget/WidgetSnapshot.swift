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

    // The snapshot dates come from date-fns, which is always Gregorian. Calendar.current
    // follows the device setting, for example islamic-umalqura in Saudi Arabia.
    static var gregorian: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .autoupdatingCurrent
        return calendar
    }

    static func dayString(_ date: Date, calendar: Calendar = gregorian) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    struct TimelineItem {
        let date: Date
        let day: WidgetSnapshot.Entry?
    }

    // Timeline dates are absolute. An hourly rebuild applies a clock or time-zone change
    // within an hour, also when the app does not run. This is 24 reloads a day.
    static let refreshInterval: TimeInterval = 60 * 60

    static func timeline(
        _ snapshot: WidgetSnapshot?,
        now: Date,
        calendar: Calendar = gregorian
    ) -> (items: [TimelineItem], refresh: Date) {
        var items = [TimelineItem(date: now, day: entry(on: dayString(now, calendar: calendar), in: snapshot))]
        for day in snapshot?.entries ?? [] {
            if let start = startOfDay(day.date, calendar: calendar), start > now {
                items.append(TimelineItem(date: start, day: day))
            }
        }
        items.sort { $0.date < $1.date }
        return (items, now.addingTimeInterval(refreshInterval))
    }

    static func startOfDay(_ day: String, calendar: Calendar = gregorian) -> Date? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }
}
