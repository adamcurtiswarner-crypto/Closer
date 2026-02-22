'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExperimentRow, ExperimentDetail } from '@/lib/queries/experiments'

export function useExperiments() {
  return useQuery<ExperimentRow[]>({
    queryKey: ['experiments'],
    queryFn: async () => {
      const res = await fetch('/api/experiments')
      if (!res.ok) throw new Error('Failed to fetch experiments')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useExperimentDetail(id: string | null) {
  return useQuery<ExperimentDetail>({
    queryKey: ['experiment', id],
    queryFn: async () => {
      const res = await fetch(`/api/experiments/${id}`)
      if (!res.ok) throw new Error('Failed to fetch experiment detail')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useUpdateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/experiments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update experiment')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiments'] })
      qc.invalidateQueries({ queryKey: ['experiment'] })
    },
  })
}

export function useCreateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create experiment')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments'] }),
  })
}
