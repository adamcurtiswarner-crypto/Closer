'use client'

import { useDashboard } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus, Target, Users, CheckCircle2 } from 'lucide-react'

function DeltaIndicator({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-sm text-green-600">
        <ArrowUp className="h-3 w-3 mr-0.5" />
        +{value}{suffix}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center text-sm text-red-600">
        <ArrowDown className="h-3 w-3 mr-0.5" />
        {value}{suffix}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-sm text-gray-400">
      <Minus className="h-3 w-3 mr-0.5" />
      0{suffix}
    </span>
  )
}

export function WmeerReviewStep() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading metrics...</div>
  }

  if (!data) {
    return <div className="text-sm text-gray-500">No dashboard data available.</div>
  }

  const { metrics, wmeerTrend } = data

  // Derive last week's data from wmeerTrend if available
  const lastWeekTrend = wmeerTrend.length >= 2 ? wmeerTrend[wmeerTrend.length - 2] : null
  const thisWeekWmeer = metrics.currentWmeer
  const lastWeekWmeer = lastWeekTrend?.wmeer ?? 0
  const wmeerDelta = thisWeekWmeer - lastWeekWmeer

  const isOnTarget = thisWeekWmeer >= metrics.wmeerTarget
  const completionsLastWeek = metrics.completionsThisWeek - metrics.completionsDelta

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">WMEER Comparison</h3>
        <p className="text-sm text-gray-500 mt-1">
          Week {metrics.currentWeek} — comparing against previous week
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* This Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">WMEER</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">{thisWeekWmeer}%</span>
                <DeltaIndicator value={wmeerDelta} suffix="%" />
              </div>
              {isOnTarget ? (
                <p className="text-xs text-green-600 mt-1">On target ({metrics.wmeerTarget}%)</p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Below target ({metrics.wmeerTarget}%)</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Active Couples</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">{metrics.activeCouples}</span>
                <DeltaIndicator value={metrics.activeCouplesDelta} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Completions</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">{metrics.completionsThisWeek}</span>
                <DeltaIndicator value={metrics.completionsDelta} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Week */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">WMEER</span>
              </div>
              <span className="text-3xl font-bold mt-1 block">{lastWeekWmeer}%</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Active Couples</span>
              </div>
              <span className="text-2xl font-bold mt-1 block">
                {metrics.activeCouples - metrics.activeCouplesDelta}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Completions</span>
              </div>
              <span className="text-2xl font-bold mt-1 block">{completionsLastWeek}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <h4 className="text-sm font-medium mb-2">WMEER Breakdown</h4>
          <p className="text-sm text-gray-600">
            WMEER (Weekly Median Engagement-to-Enrollment Ratio) measures the
            proportion of enrolled couples who completed at least one prompt this
            week. A WMEER of {thisWeekWmeer}% means that roughly {thisWeekWmeer}
            out of every 100 couples engaged this week. The current target is{' '}
            {metrics.wmeerTarget}%.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-gray-500">Completion Rate</div>
              <div className="font-semibold">{metrics.completionRate}%</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-gray-500">D7 Retention</div>
              <div className="font-semibold">{metrics.d7Retention}%</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-gray-500">Target</div>
              <div className="font-semibold">{metrics.wmeerTarget}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
