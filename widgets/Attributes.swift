import ActivityKit

// Required by the react-native-widget-extension plugin (compiled into both
// the app pod and the widget target). Stoke does not use Live Activities —
// this is the minimal valid ActivityAttributes definition.
struct StokeWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {}
}
