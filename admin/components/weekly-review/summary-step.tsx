'use client'

import { useMemo, useCallback } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { usePrompts } from '@/hooks/usePrompts'
import { useCohorts } from '@/hooks/useCohorts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Download, CheckCircle2, AlertCircle, Users } from 'lucide-react'

export function SummaryStep() {
  const { data: dashboardData } = useDashboard()
  const { data: prompts } = usePrompts()
  const { data: cohorts } = useCohorts()

  const summary = useMemo(() => {
    const metrics = dashboardData?.metrics
    const wmeerTrend = dashboardData?.wmeerTrend ?? []

    // Prompt counts
    let retireCount = 0
    let graduateCount = 0
    let rewriteCount = 0

    if (prompts) {
      for (const p of prompts) {
        if (p.status === 'retired') continue
        const rate = p.completion_rate
        const assigned = p.times_assigned
        if (assigned >= 10 && rate < 0.3) retireCount++
        else if (p.status === 'testing' && assigned >= 10 && rate > 0.75) graduateCount++
        else if (assigned >= 10 && rate >= 0.3 && rate <= 0.5) rewriteCount++
      }
    }

    // Cohort health
    const activeCohorts = cohorts?.filter(c => c.status === 'active' || c.status === 'mature') ?? []
    const concernCohorts = activeCohorts.filter(c => c.wmeer < 30 || (c.w4Retention > 0 && c.w4Retention < 40))

    // WMEER trend
    const lastWeekWmeer = wmeerTrend.length >= 2 ? wmeerTrend[wmeerTrend.length - 2]?.wmeer ?? 0 : 0
    const currentWmeer = metrics?.currentWmeer ?? 0
    const wmeerDelta = currentWmeer - lastWeekWmeer
    const wmeerDirection = wmeerDelta > 0 ? 'up' : wmeerDelta < 0 ? 'down' : 'flat'

    return {
      currentWmeer,
      wmeerTarget: metrics?.wmeerTarget ?? 50,
      wmeerDelta,
      wmeerDirection,
      activeCouples: metrics?.activeCouples ?? 0,
      completionsThisWeek: metrics?.completionsThisWeek ?? 0,
      completionRate: metrics?.completionRate ?? 0,
      retireCount,
      graduateCount,
      rewriteCount,
      totalActiveCohorts: activeCohorts.length,
      concernCohorts: concernCohorts.length,
      week: metrics?.currentWeek ?? 'N/A',
    }
  }, [dashboardData, prompts, cohorts])

  const downloadReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      week: summary.week,
      wmeer: {
        current: summary.currentWmeer,
        target: summary.wmeerTarget,
        delta: summary.wmeerDelta,
        direction: summary.wmeerDirection,
      },
      engagement: {
        activeCouples: summary.activeCouples,
        completionsThisWeek: summary.completionsThisWeek,
        completionRate: summary.completionRate,
      },
      prompts: {
        flaggedForRetirement: summary.retireCount,
        readyToGraduate: summary.graduateCount,
        needsRewrite: summary.rewriteCount,
      },
      cohorts: {
        activeCohorts: summary.totalActiveCohorts,
        withConcerns: summary.concernCohorts,
      },
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-review-${summary.week}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [summary])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Weekly Summary</h3>
        <p className="text-sm text-gray-500 mt-1">
          Review for week {summary.week}
        </p>
      </div>

      {/* WMEER Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {summary.currentWmeer >= summary.wmeerTarget ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            WMEER Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            WMEER is at <strong>{summary.currentWmeer}%</strong>
            {summary.wmeerDirection === 'up' && (
              <span className="text-green-600"> (+{summary.wmeerDelta}% from last week)</span>
            )}
            {summary.wmeerDirection === 'down' && (
              <span className="text-red-600"> ({summary.wmeerDelta}% from last week)</span>
            )}
            {summary.wmeerDirection === 'flat' && (
              <span className="text-gray-500"> (no change from last week)</span>
            )}
            .{' '}
            {summary.currentWmeer >= summary.wmeerTarget
              ? 'Currently meeting the target.'
              : `Below the ${summary.wmeerTarget}% target.`}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {summary.activeCouples} active couples completed {summary.completionsThisWeek} prompts
            at a {summary.completionRate}% completion rate.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Prompt Actions Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Prompt Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {summary.retireCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>
                  <strong>{summary.retireCount}</strong> prompt{summary.retireCount !== 1 ? 's' : ''} flagged
                  for retirement (below 30% completion)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span>No prompts flagged for retirement</span>
              </div>
            )}

            {summary.graduateCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span>
                  <strong>{summary.graduateCount}</strong> prompt{summary.graduateCount !== 1 ? 's' : ''} ready
                  to graduate (above 75% completion)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span>No prompts ready to graduate</span>
              </div>
            )}

            {summary.rewriteCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                <span>
                  <strong>{summary.rewriteCount}</strong> prompt{summary.rewriteCount !== 1 ? 's' : ''} could
                  benefit from rewriting (30-50% completion)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span>No prompts need rewriting</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cohort Health Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            Cohort Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            {summary.totalActiveCohorts} active/mature cohort{summary.totalActiveCohorts !== 1 ? 's' : ''}.
            {summary.concernCohorts > 0 ? (
              <span className="text-yellow-700">
                {' '}{summary.concernCohorts} cohort{summary.concernCohorts !== 1 ? 's' : ''} showing
                health concerns (low WMEER or high churn).
              </span>
            ) : (
              <span className="text-green-600"> All cohorts are healthy.</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-center">
        <Button variant="outline" onClick={downloadReport} className="gap-2">
          <Download className="h-4 w-4" />
          Download Report (JSON)
        </Button>
      </div>
    </div>
  )
}
