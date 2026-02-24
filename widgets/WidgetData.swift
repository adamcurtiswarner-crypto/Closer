import Foundation

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

    static let appGroupId = "group.com.stoke.app"
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
        partnerName: "Partner",
        promptStatus: "none",
        promptText: "",
        anniversaryDaysLeft: -1,
        anniversaryIsToday: false,
        lastUpdated: ""
    )
}
