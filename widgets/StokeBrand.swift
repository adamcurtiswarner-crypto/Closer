import SwiftUI

// Stoke brand palette for widgets — mirror of src/config/theme.ts
// (the only truth). Update both together.
enum StokeBrand {
    /// #D4522A — colors.accent.primary
    static let accent = Color(red: 0.831, green: 0.322, blue: 0.165)
    /// #1E1E2E — ink / colors.text.primary
    static let ink = Color(red: 0.118, green: 0.118, blue: 0.180)
    /// #5A5560 approximation of colors.text.secondary
    static let secondary = Color(red: 0.353, green: 0.333, blue: 0.376)
    /// muted text
    static let muted = Color(red: 0.604, green: 0.584, blue: 0.616)
    /// #4E7E52 — sage / colors.accent.success
    static let success = Color(red: 0.306, green: 0.494, blue: 0.322)
    /// #F5F2EE — colors.surface.background
    static let background = Color(red: 0.961, green: 0.949, blue: 0.933)
    /// #FDF1ED — colors.surface.warmTint
    static let warmTint = Color(red: 0.992, green: 0.945, blue: 0.929)
}
