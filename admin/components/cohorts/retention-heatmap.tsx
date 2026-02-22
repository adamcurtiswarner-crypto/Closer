'use client'

import { useMemo } from 'react'
import type { RetentionCell } from '@/lib/queries/cohorts'
import { useRetentionHeatmap } from '@/hooks/useCohorts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function cellColor(retention: number): string {
  if (retention >= 70) return 'bg-green-200 text-green-900'
  if (retention >= 50) return 'bg-yellow-200 text-yellow-900'
  if (retention > 0) return 'bg-red-200 text-red-900'
  return 'bg-gray-50 text-gray-400'
}

export function RetentionHeatmap() {
  const { data: cells, isLoading } = useRetentionHeatmap()

  const { cohorts, weeks, matrix } = useMemo(() => {
    if (!cells || cells.length === 0) {
      return { cohorts: [] as string[], weeks: [] as number[], matrix: new Map<string, number>() }
    }

    // Extract unique cohorts and week numbers
    const cohortSet = new Set<string>()
    const weekSet = new Set<number>()
    const matrixMap = new Map<string, number>()

    for (const cell of cells) {
      cohortSet.add(cell.cohort)
      weekSet.add(cell.week)
      matrixMap.set(`${cell.cohort}-${cell.week}`, cell.retention)
    }

    const sortedCohorts = Array.from(cohortSet).sort()
    const sortedWeeks = Array.from(weekSet).sort((a, b) => a - b)

    return { cohorts: sortedCohorts, weeks: sortedWeeks, matrix: matrixMap }
  }, [cells])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading retention data...
        </CardContent>
      </Card>
    )
  }

  if (cohorts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No retention data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Heatmap</CardTitle>
        <CardDescription>
          Percentage of each cohort active in subsequent weeks. Green &gt;70%, yellow 50-70%, red &lt;50%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b">
                  Cohort
                </th>
                {weeks.map((w) => (
                  <th
                    key={w}
                    className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-b"
                  >
                    W{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {cohort}
                  </td>
                  {weeks.map((w) => {
                    const key = `${cohort}-${w}`
                    const value = matrix.get(key)
                    const hasValue = value !== undefined

                    return (
                      <td key={w} className="px-1 py-1 text-center">
                        {hasValue ? (
                          <div
                            className={`rounded px-2 py-1 text-xs font-medium ${cellColor(value)}`}
                          >
                            {value}%
                          </div>
                        ) : (
                          <div className="rounded px-2 py-1 text-xs text-gray-300">
                            --
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
