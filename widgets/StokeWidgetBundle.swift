import SwiftUI
import WidgetKit

// StreakWidget is intentionally gone (2026-08-02): streaks are hidden in v1
// and the anti-guilt doctrine bans streak surfaces. Do not re-add it without
// flipping FEATURES.streaks and a founder decision.
@main
struct StokeWidgetBundle: WidgetBundle {
    var body: some Widget {
        PromptWidget()
        AnniversaryWidget()
    }
}
