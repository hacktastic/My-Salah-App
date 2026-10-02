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
