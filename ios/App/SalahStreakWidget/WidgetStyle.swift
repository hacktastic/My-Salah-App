import SwiftUI
import WidgetKit

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

enum WidgetColors {
    static let secondaryText = Color(hex: 0x8E8E93)
    static let halo = Color(hex: 0xF2C94C)

    static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x1B1B1C) : Color(hex: 0xF7F7F7)
    }

    static func text(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? .white : .black
    }

    static func wreath(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xE9E9E9) : .black
    }
}

enum SalahStatusStyle {
    // Copied from salahStatusColorsHexCodes in src/utils/constants.tsx.
    static func color(_ status: String) -> Color {
        switch status {
        case "group", "male-alone", "female-alone": return Color(hex: 0x5FAE82)
        case "excused": return Color(hex: 0x8C4FB5)
        case "late": return Color(hex: 0xE5B233)
        case "missed": return Color(hex: 0xE5484D)
        default: return Color(hex: 0x585858)
        }
    }

    // Copied from the labels in src/components/BottomSheets/BottomSheetSingleDateView.tsx.
    static func label(_ status: String) -> String {
        switch status {
        case "group": return "In Jamaah"
        case "male-alone": return "On Time"
        case "female-alone": return "Prayed"
        case "late": return "Late"
        case "missed": return "Missed"
        case "excused": return "Excused"
        default: return "—"
        }
    }

    // The same rule as showsSalahHalo in src/utils/constants.tsx.
    static func showsHalo(_ status: String) -> Bool {
        status == "group" || status == "female-alone"
    }

    static func breaksStreakToday(_ status: String) -> Bool {
        status == "late" || status == "missed"
    }
}

struct SalahDot: View {
    let status: String
    var size: CGFloat = 12
    var showsHalo = false

    var body: some View {
        ZStack {
            if status.isEmpty {
                Circle().stroke(SalahStatusStyle.color(status), lineWidth: 1.5)
            } else {
                Circle().fill(SalahStatusStyle.color(status))
            }
            if showsHalo && SalahStatusStyle.showsHalo(status) {
                Circle().stroke(WidgetColors.halo, lineWidth: 1.5).padding(-3)
            }
        }
        .frame(width: size, height: size)
    }
}

struct StreakCountView: View {
    @Environment(\.colorScheme) private var colorScheme
    let day: WidgetSnapshot.Entry

    private var brokenToday: Bool {
        day.salah.contains { SalahStatusStyle.breaksStreakToday($0.status) }
    }

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Image("LaurelLeft").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 25)
                Text("\(day.streak)")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundColor(brokenToday ? WidgetColors.secondaryText : WidgetColors.text(colorScheme))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                Image("LaurelRight").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 25)
            }
            .foregroundColor(WidgetColors.wreath(colorScheme))

            Text("day streak")
                .font(.caption2)
                .foregroundColor(WidgetColors.secondaryText)
        }
    }
}

struct EmptyStateView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text("Open My Salah App to start your streak")
            .font(.footnote)
            .multilineTextAlignment(.center)
            .foregroundColor(WidgetColors.text(colorScheme))
    }
}

extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            // Before iOS 17 the background covers only the content, not the whole widget.
            frame(maxWidth: .infinity, maxHeight: .infinity).background(color)
        }
    }
}
