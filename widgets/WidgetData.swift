import Foundation

// Decoded from the JSON the app writes via widgetBridge.ts — this field set
// must stay a superset of what the bridge sends. currentStreak is still
// written by the app but no widget renders it: streaks are hidden in v1
// (anti-guilt doctrine).
struct WidgetData: Codable {
    let currentStreak: Int
    let daysAsCouple: Int
    let userName: String
    let partnerName: String
    let promptStatus: String
    let promptText: String
    let anniversaryDaysLeft: Int
    let anniversaryIsToday: Bool
    let lastUpdated: String

    static let appGroupId = "group.io.getstoke.app"
    static let storageKey = "widgetData"

    static func load() -> WidgetData {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let jsonString = defaults.string(forKey: storageKey),
              let jsonData = jsonString.data(using: .utf8),
              let data = try? JSONDecoder().decode(WidgetData.self, from: jsonData)
        else {
            return .placeholder
        }
        return data
    }

    static let placeholder = WidgetData(
        currentStreak: 0,
        daysAsCouple: 0,
        userName: "You",
        partnerName: "Your partner",
        promptStatus: "none",
        promptText: "",
        anniversaryDaysLeft: -1,
        anniversaryIsToday: false,
        lastUpdated: ""
    )
}
