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
                Group {
                    if family == .systemMedium {
                        MediumView(day: day)
                    } else {
                        SmallView(day: day)
                    }
                }
                // One description for the whole widget, so VoiceOver does not read "F D A M I".
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(SalahText.accessibilityDescription(day))
            } else {
                EmptyStateView()
            }
        }
        .widgetBackground(WidgetColors.background(colorScheme))
    }
}
