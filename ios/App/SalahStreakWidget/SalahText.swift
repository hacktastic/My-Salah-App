import Foundation

// Foundation only, so that SalahStreakWidgetChecks can run it on macOS.
enum SalahText {
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

    // The stored key is "Asar"; the app shows "Asr" (SalahTable.tsx).
    static func displayName(_ name: String) -> String {
        name == "Asar" ? "Asr" : name
    }

    static func accessibilityDescription(_ day: WidgetSnapshot.Entry) -> String {
        let salah = day.salah.map { item in
            "\(displayName(item.name)): \(item.status.isEmpty ? "Not logged" : label(item.status))."
        }
        return (["\(day.streak) day streak."] + salah).joined(separator: " ")
    }
}
