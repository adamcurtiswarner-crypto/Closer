'use client'

import { NotificationTemplates } from '@/components/settings/notification-templates'
import { KillThresholds } from '@/components/settings/kill-thresholds'
import { DataExport } from '@/components/settings/data-export'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage notification templates, prompt graduation thresholds, and data exports.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Notification Templates</h2>
        <NotificationTemplates />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Kill Thresholds</h2>
        <KillThresholds />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Data Export</h2>
        <DataExport />
      </section>
    </div>
  )
}
