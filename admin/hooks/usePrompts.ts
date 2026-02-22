'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PromptRow, PromptDetail } from '@/lib/queries/prompts'

export function usePrompts(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters)
  return useQuery<PromptRow[]>({
    queryKey: ['prompts', filters],
    queryFn: async () => {
      const res = await fetch(`/api/prompts?${params}`)
      if (!res.ok) throw new Error('Failed to fetch prompts')
      return res.json()
    },
  })
}

export function usePromptDetail(id: string | null) {
  return useQuery<PromptDetail>({
    queryKey: ['prompt', id],
    queryFn: async () => {
      const res = await fetch(`/api/prompts/${id}`)
      if (!res.ok) throw new Error('Failed to fetch prompt')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create prompt')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })
}

export function useUpdatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update prompt')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompt'] })
    },
  })
}
