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
    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let timeline = SnapshotStore.timeline(SnapshotStore.load(), now: Date())
        let entries = timeline.items.map { StreakEntry(date: $0.date, day: $0.day) }
        completion(Timeline(entries: entries, policy: .after(timeline.refresh)))
    }
}
