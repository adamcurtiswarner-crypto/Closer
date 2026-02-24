import SwiftUI
import WidgetKit

struct AnniversaryWidget: Widget {
    let kind = "AnniversaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StokeTimelineProvider()) { entry in
            AnniversaryWidgetView(entry: entry)
        }
        .configurationDisplayName("Anniversary")
        .description("Countdown to your anniversary")
        .supportedFamilies([.systemSmall])
    }
}

struct AnniversaryWidgetView: View {
    let entry: StokeWidgetEntry

    private let accent = Color(red: 0.788, green: 0.455, blue: 0.329)
    private let secondary = Color(red: 0.471, green: 0.443, blue: 0.412)
    private let muted = Color(red: 0.659, green: 0.635, blue: 0.624)
    private let bg = Color(red: 0.98, green: 0.98, blue: 0.976)
    private let warmBg = Color(red: 0.996, green: 0.969, blue: 0.957)

    var body: some View {
        if entry.data.anniversaryIsToday {
            VStack(spacing: 8) {
                Text("\u{1F389}")
                    .font(.system(size: 32))
                Text("Happy\nAnniversary!")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(accent)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(warmBg)
        } else if entry.data.anniversaryDaysLeft > 0 {
            VStack(spacing: 4) {
                Text("\u{1F4C5}")
                    .font(.system(size: 28))
                Text("\(entry.data.anniversaryDaysLeft)")
                    .font(.system(size: 36, weight: .heavy))
                    .foregroundColor(accent)
                Text("days until your\nanniversary")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(bg)
        } else {
            VStack(spacing: 8) {
                Text("\u{1F4C5}")
                    .font(.system(size: 28))
                Text("Set your\nanniversary\nin Settings")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(bg)
        }
    }
}
