import SwiftUI
import WidgetKit

struct StreakWidget: Widget {
    let kind = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak & Days")
        .description("See your streak and days together")
        .supportedFamilies([.systemSmall])
    }
}

struct StreakWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text("\u{1F525}")
                    .font(.system(size: 20))
                Text("\(entry.data.currentStreak)")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundColor(accent)
            }
            Text("day streak")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(secondary)

            Spacer()

            HStack(spacing: 6) {
                Text("\u{2764}\u{FE0F}")
                    .font(.system(size: 16))
                Text("\(entry.data.daysAsCouple)")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(accent)
            }
            Text("days together")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(secondary)

            Spacer()

            Text("\(entry.data.userName) & \(entry.data.partnerName)")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(muted)
                .lineLimit(1)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(bg)
    }
}
