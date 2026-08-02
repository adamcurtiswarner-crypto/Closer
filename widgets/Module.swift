import ActivityKit
import ExpoModulesCore
import WidgetKit

// Compiled into the ReactNativeWidgetExtension pod (app target), NOT the
// widget extension — the plugin copies this file to the package's ios/
// folder at prebuild. JS reaches it via requireNativeModule in
// src/services/widgetBridge.ts.
//
// Stoke uses static widgets only. The Live Activity functions exist because
// the package's JS API declares them; they are deliberate no-ops.
public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")

        Function("areActivitiesEnabled") { () -> Bool in
            false
        }

        Function("startActivity") { () -> Bool in
            false
        }

        Function("updateActivity") { () -> Void in }

        Function("endActivity") { () -> Void in }

        Function("reloadAllTimelines") { () -> Void in
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
