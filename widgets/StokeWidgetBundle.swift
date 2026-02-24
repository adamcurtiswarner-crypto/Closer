import SwiftUI
import WidgetKit

@main
struct StokeWidgetBundle: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        PromptWidget()
        AnniversaryWidget()
    }
}
