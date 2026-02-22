'use client'

import { useQuery } from '@tanstack/react-query'
import type { CohortRow, CohortDetail, RetentionCell } from '@/lib/queries/cohorts'

export function useCohorts() {
  return useQuery<CohortRow[]>({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const res = await fetch('/api/cohorts')
      if (!res.ok) throw new Error('Failed to fetch cohorts')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useCohortDetail(id: string | null) {
  return useQuery<CohortDetail>({
    queryKey: ['cohort', id],
    queryFn: async () => {
      const res = await fetch(`/api/cohorts/${id}`)
      if (!res.ok) throw new Error('Failed to fetch cohort detail')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useRetentionHeatmap() {
  return useQuery<RetentionCell[]>({
    queryKey: ['cohorts', 'retention'],
    queryFn: async () => {
      const res = await fetch('/api/cohorts?view=retention')
      if (!res.ok) throw new Error('Failed to fetch retention heatmap')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })
}
