import SwiftUI
import WidgetKit

struct PromptWidget: Widget {
    let kind = "PromptWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            PromptWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Question")
        .description("Today's question and where you two are with it.")
        .supportedFamilies([.systemMedium])
    }
}

// Brand voice (see app CLAUDE.md): warm, quiet, direct. No emojis, no
// exclamation points, no quote marks around the prompt, celebrate quietly.
struct PromptWidgetView: View {
    let entry: StokeWidgetEntry

    private var statusText: String {
        switch entry.data.promptStatus {
        case "your_turn":
            return "Your turn"
        case "waiting_partner":
            return "Waiting for \(entry.data.partnerName)"
        case "complete":
            return "Both answered"
        default:
            return "A new question each morning"
        }
    }

    private var statusColor: Color {
        switch entry.data.promptStatus {
        case "your_turn": return StokeBrand.accent
        case "complete": return StokeBrand.success
        default: return StokeBrand.muted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Stoke")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundColor(StokeBrand.ink)
                Spacer()
                Text(statusText)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(statusColor)
            }

            if !entry.data.promptText.isEmpty {
                Text(entry.data.promptText)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(StokeBrand.ink)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Today's question is on the way.")
                    .font(.system(size: 13))
                    .foregroundColor(StokeBrand.muted)
            }

            Spacer()

            if entry.data.daysAsCouple > 0 {
                Text("\(entry.data.daysAsCouple) days together")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(StokeBrand.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(StokeBrand.background, for: .widget)
    }
}
