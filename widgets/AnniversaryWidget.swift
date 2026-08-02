import SwiftUI
import WidgetKit

struct AnniversaryWidget: Widget {
    let kind = "AnniversaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            AnniversaryWidgetView(entry: entry)
        }
        .configurationDisplayName("Anniversary")
        .description("Days until your anniversary.")
        .supportedFamilies([.systemSmall])
    }
}

// Brand voice: no emojis, no exclamation points, celebrate quietly.
struct AnniversaryWidgetView: View {
    let entry: StokeWidgetEntry

    var body: some View {
        Group {
            if entry.data.anniversaryIsToday {
                VStack(spacing: 6) {
                    Text("Today")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(StokeBrand.accent)
                    Text("Happy anniversary")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(StokeBrand.ink)
                        .multilineTextAlignment(.center)
                }
            } else if entry.data.anniversaryDaysLeft > 0 {
                VStack(spacing: 4) {
                    Text("\(entry.data.anniversaryDaysLeft)")
                        .font(.system(size: 36, weight: .heavy))
                        .foregroundColor(StokeBrand.accent)
                    Text("days until your\nanniversary")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(StokeBrand.secondary)
                        .multilineTextAlignment(.center)
                }
            } else {
                VStack(spacing: 6) {
                    Text("Set your anniversary\nin Settings")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(StokeBrand.muted)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(
            entry.data.anniversaryIsToday ? StokeBrand.warmTint : StokeBrand.background,
            for: .widget
        )
    }
}
