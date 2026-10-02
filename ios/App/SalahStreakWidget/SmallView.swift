import SwiftUI

struct SmallView: View {
    let day: WidgetSnapshot.Entry

    var body: some View {
        VStack(spacing: 10) {
            StreakCountView(day: day)
            HStack(spacing: 10) {
                ForEach(Array(day.salah.prefix(5).enumerated()), id: \.offset) { _, salah in
                    // The halo draws 3 points outside the dot, so the spacing leaves room for it.
                    VStack(spacing: 5) {
                        SalahDot(status: salah.status, showsHalo: true)
                        Text(String(salah.name.prefix(1)))
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(WidgetColors.secondaryText)
                    }
                }
            }
        }
    }
}
