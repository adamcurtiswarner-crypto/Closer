'use client'

import { useState } from 'react'
import { useCohorts } from '@/hooks/useCohorts'
import { CohortTable } from '@/components/cohorts/cohort-table'
import { CohortDetail } from '@/components/cohorts/cohort-detail'
import { RetentionHeatmap } from '@/components/cohorts/retention-heatmap'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CohortsPage() {
  const { data: cohorts, isLoading } = useCohorts()
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cohorts</h1>
        <span className="text-sm text-gray-500">
          {cohorts ? `${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading cohorts...</div>
          ) : (
            <CohortTable
              cohorts={cohorts ?? []}
              selectedId={selectedCohortId}
              onSelectCohort={setSelectedCohortId}
            />
          )}

          {selectedCohortId && (
            <CohortDetail
              cohortId={selectedCohortId}
              onClose={() => setSelectedCohortId(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="retention">
          <RetentionHeatmap />
        </TabsContent>
      </Tabs>
    </div>
  )
}
