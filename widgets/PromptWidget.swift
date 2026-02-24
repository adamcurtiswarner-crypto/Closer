import SwiftUI
import WidgetKit

struct PromptWidget: Widget {
    let kind = "PromptWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            PromptWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Prompt")
        .description("See today's prompt and status")
        .supportedFamilies([.systemMedium])
    }
}

struct PromptWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let dark = Color(red: 0.110, green: 0.098, blue: 0.090)
    private let bodyColor = Color(red: 0.341, green: 0.325, blue: 0.306)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let success = Color(red: 0.133, green: 0.773, blue: 0.369)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)

    private var statusText: String {
        switch entry.data.promptStatus {
        case "your_turn":
            return "Your turn \u{2192}"
        case "waiting_partner":
            return "Waiting for \(entry.data.partnerName)"
        case "complete":
            return "Both responded \u{2713}"
        default:
            return "New prompt coming soon"
        }
    }

    private var statusColor: Color {
        switch entry.data.promptStatus {
        case "your_turn": return accent
        case "complete": return success
        default: return muted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\u{1F3D5}\u{FE0F}")
                    .font(.system(size: 16))
                Text("Stoke")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(dark)
                Spacer()
                Text(statusText)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(statusColor)
            }

            if !entry.data.promptText.isEmpty {
                Text("\u{201C}\(entry.data.promptText)\u{201D}")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(bodyColor)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Check back later for today's prompt")
                    .font(.system(size: 13))
                    .foregroundColor(muted)
            }

            Spacer()

            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Text("\u{1F525}")
                        .font(.system(size: 12))
                    Text("\(entry.data.currentStreak)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(secondary)
                    Text("streak")
                        .font(.system(size: 11))
                        .foregroundColor(muted)
                }
                HStack(spacing: 4) {
                    Text("\u{2764}\u{FE0F}")
                        .font(.system(size: 12))
                    Text("\(entry.data.daysAsCouple)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(secondary)
                    Text("days")
                        .font(.system(size: 11))
                        .foregroundColor(muted)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(bg)
    }
}
