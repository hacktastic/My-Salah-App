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
