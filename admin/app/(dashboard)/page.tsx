'use client'

import { useDashboard } from '@/hooks/useDashboard'
import { MetricCard } from '@/components/dashboard/metric-card'
import { WmeerSummary } from '@/components/dashboard/wmeer-summary'
import { WmeerChart } from '@/components/dashboard/wmeer-chart'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return <div className="text-gray-500">Loading dashboard...</div>
  }

  const { metrics, wmeerTrend, alerts } = data!

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <QuickActions />
      </div>

      <WmeerSummary
        currentWmeer={metrics.currentWmeer}
        target={metrics.wmeerTarget}
        week={metrics.currentWeek}
      />

      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Active Couples" value={metrics.activeCouples} delta={metrics.activeCouplesDelta} />
        <MetricCard title="Completions This Week" value={metrics.completionsThisWeek} delta={metrics.completionsDelta} />
        <MetricCard title="Completion Rate" value={metrics.completionRate} delta={metrics.completionRateDelta} suffix="%" />
        <MetricCard title="D7 Retention" value={metrics.d7Retention} delta={metrics.d7RetentionDelta} suffix="%" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WmeerChart data={wmeerTrend} target={50} />
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  )
}
