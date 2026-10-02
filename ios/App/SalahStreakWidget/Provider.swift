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
