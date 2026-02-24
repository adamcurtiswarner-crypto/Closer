import WidgetKit

struct StokeWidgetEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct StokeTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> StokeWidgetEntry {
        StokeWidgetEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (StokeWidgetEntry) -> Void) {
        let entry = StokeWidgetEntry(date: Date(), data: WidgetData.load())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StokeWidgetEntry>) -> Void) {
        let data = WidgetData.load()
        let entry = StokeWidgetEntry(date: Date(), data: data)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
