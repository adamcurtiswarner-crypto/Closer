'use client'

import { useCohorts } from '@/hooks/useCohorts'
import type { CohortRow } from '@/lib/queries/cohorts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, Users, AlertTriangle } from 'lucide-react'

function statusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'mature': return 'bg-blue-100 text-blue-800'
    case 'graduated': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function CohortReviewStep() {
  const { data: cohorts, isLoading } = useCohorts()

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading cohorts...</div>
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Cohort Review</h3>
        <Card>
          <CardContent className="pt-4 text-center text-sm text-gray-500">
            No cohorts found.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only show active and mature cohorts
  const activeCohorts = cohorts.filter(c => c.status === 'active' || c.status === 'mature')
  const graduatedCohorts = cohorts.filter(c => c.status === 'graduated')

  // Identify health concerns: low WMEER or high churn (low retention)
  function hasHealthConcern(cohort: CohortRow): boolean {
    return cohort.wmeer < 30 || (cohort.w4Retention > 0 && cohort.w4Retention < 40)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Cohort Review</h3>
        <p className="text-sm text-gray-500 mt-1">
          Per-cohort health overview. Focus on active and mature cohorts.
        </p>
      </div>

      {activeCohorts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Active &amp; Mature Cohorts</h4>
          {activeCohorts.map(cohort => {
            const concern = hasHealthConcern(cohort)
            return (
              <Card
                key={cohort.id}
                className={concern ? 'border-yellow-300 bg-yellow-50/30' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {concern && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      Cohort {cohort.week}
                    </CardTitle>
                    <Badge className={statusColor(cohort.status)}>
                      {cohort.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Couples
                      </div>
                      <div className="font-semibold">
                        {cohort.activeCount}/{cohort.couplesCount}
                      </div>
                      <div className="text-xs text-gray-400">active/total</div>
                    </div>

                    <div>
                      <div className="text-gray-500">WMEER</div>
                      <div className="font-semibold flex items-center gap-1">
                        {cohort.wmeer}%
                        {cohort.wmeer >= 50 ? (
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500">W1 Ret.</div>
                      <div className="font-semibold">{cohort.w1Retention}%</div>
                    </div>

                    <div>
                      <div className="text-gray-500">W4 Ret.</div>
                      <div className="font-semibold">{cohort.w4Retention}%</div>
                    </div>
                  </div>

                  {concern && (
                    <p className="text-xs text-yellow-700 mt-3 bg-yellow-100 rounded px-2 py-1">
                      {cohort.wmeer < 30 && 'Low WMEER — engagement below healthy threshold. '}
                      {cohort.w4Retention > 0 && cohort.w4Retention < 40 && 'High churn risk — W4 retention is low.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {graduatedCohorts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">
            Graduated Cohorts ({graduatedCohorts.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {graduatedCohorts.map(cohort => (
              <Card key={cohort.id} className="bg-gray-50">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cohort.week}</span>
                    <span className="text-gray-500">{cohort.couplesCount} couples</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    WMEER {cohort.wmeer}% | W12 Ret. {cohort.w12Retention}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
