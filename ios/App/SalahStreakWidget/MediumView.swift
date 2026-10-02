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
                        Text(salah.displayName)
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
