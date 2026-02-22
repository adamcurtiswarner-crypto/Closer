'use client'

import { useState, useCallback } from 'react'
import type { PromptRow, PromptDetail } from '@/lib/queries/prompts'
import { usePrompts, useUpdatePrompt, useCreatePrompt } from '@/hooks/usePrompts'
import { PromptFiltersBar, type PromptFilters } from '@/components/prompts/prompt-filters'
import { PromptsTable, type PromptAction } from '@/components/prompts/prompts-table'
import { PromptDetailModal } from '@/components/prompts/prompt-detail-modal'
import { PromptForm } from '@/components/prompts/prompt-form'

export default function PromptsPage() {
  const [filters, setFilters] = useState<PromptFilters>({})
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState<PromptDetail | undefined>(undefined)

  // Build query params from filters (strip empty values)
  const queryFilters: Record<string, string> = {}
  if (filters.status) queryFilters.status = filters.status
  if (filters.type) queryFilters.type = filters.type
  if (filters.depth) queryFilters.depth = filters.depth
  if (filters.search) queryFilters.search = filters.search

  const { data: prompts, isLoading } = usePrompts(
    Object.keys(queryFilters).length > 0 ? queryFilters : undefined
  )
  const updateMutation = useUpdatePrompt()
  const createMutation = useCreatePrompt()

  const handleViewDetail = useCallback((id: string) => {
    setSelectedPromptId(id)
    setDetailOpen(true)
  }, [])

  const handleEdit = useCallback((prompt: PromptRow) => {
    // We set the edit prompt data from the row; the form will use it as initial values.
    // For a full edit, we cast the row to PromptDetail shape with defaults for missing fields.
    const detail: PromptDetail = {
      ...prompt,
      research_basis: '',
      requires_conversation: false,
      avg_response_length: 0,
      week_restriction: null,
      max_per_week: null,
      day_preference: null,
      testing_started_at: null,
      status_changed_at: '',
      created_by: '',
    }
    setEditPrompt(detail)
    setFormOpen(true)
  }, [])

  const handleCreateClick = useCallback(() => {
    setEditPrompt(undefined)
    setFormOpen(true)
  }, [])

  const handleAction = useCallback(async (id: string, action: PromptAction) => {
    switch (action) {
      case 'view':
        handleViewDetail(id)
        break
      case 'promote':
        await updateMutation.mutateAsync({ id, action: 'promote' })
        break
      case 'retire':
        await updateMutation.mutateAsync({ id, action: 'retire' })
        break
      case 'flag':
        await updateMutation.mutateAsync({ id, status: 'flagged' })
        break
      case 'duplicate': {
        const source = prompts?.find((p) => p.id === id)
        if (source) {
          await createMutation.mutateAsync({
            text: source.text,
            type: source.type,
            emotional_depth: source.emotional_depth,
            research_basis: 'original',
            status: 'draft',
          })
        }
        break
      }
    }
  }, [updateMutation, createMutation, prompts, handleViewDetail])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prompts</h1>
        <span className="text-sm text-gray-500">
          {prompts ? `${prompts.length} prompt${prompts.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <PromptFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        onCreateClick={handleCreateClick}
      />

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading prompts...</div>
      ) : (
        <PromptsTable
          prompts={prompts ?? []}
          onViewDetail={handleViewDetail}
          onEdit={handleEdit}
          onAction={handleAction}
        />
      )}

      <PromptDetailModal
        promptId={selectedPromptId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <PromptForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editPrompt={editPrompt}
      />
    </div>
  )
}
