'use client'

import { useMemo, useState } from 'react'
import type { PromptRow } from '@/lib/queries/prompts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowUpDown,
  Copy,
  Eye,
  Flag,
  MoreHorizontal,
  Pencil,
  TrendingUp,
  Archive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const PAGE_SIZE = 20

type SortKey = 'text' | 'type' | 'emotional_depth' | 'completion_rate' | 'positive_response_rate' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
  testing: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Testing' },
  draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
  retired: { className: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Retired' },
  flagged: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Flagged' },
}

const TYPE_LABELS: Record<string, string> = {
  love_map_update: 'Love Map',
  conflict_navigation: 'Conflict Nav',
  bid_for_connection: 'Bid for Connection',
  appreciation_expression: 'Appreciation',
  dream_exploration: 'Dream Exploration',
  repair_attempt: 'Repair Attempt',
}

const DEPTH_LABELS: Record<string, string> = {
  surface: 'Surface',
  medium: 'Medium',
  deep: 'Deep',
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function rateColor(rate: number): string {
  if (rate >= 70) return 'text-green-600'
  if (rate >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

export type PromptAction = 'view' | 'edit' | 'promote' | 'flag' | 'retire' | 'duplicate'

interface PromptsTableProps {
  prompts: PromptRow[]
  onViewDetail: (id: string) => void
  onEdit: (prompt: PromptRow) => void
  onAction: (id: string, action: PromptAction) => void
}

export function PromptsTable({ prompts, onViewDetail, onEdit, onAction }: PromptsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    const items = [...prompts]
    items.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
    return items
  }, [prompts, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function SortableHead({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    return (
      <TableHead>
        <button
          className="flex items-center gap-1 hover:text-gray-900"
          onClick={() => toggleSort(sortKeyName)}
        >
          {label}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Status" sortKeyName="status" />
              <SortableHead label="Prompt Text" sortKeyName="text" />
              <SortableHead label="Type" sortKeyName="type" />
              <SortableHead label="Depth" sortKeyName="emotional_depth" />
              <SortableHead label="Completion %" sortKeyName="completion_rate" />
              <SortableHead label="Positive %" sortKeyName="positive_response_rate" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No prompts found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((prompt) => {
                const statusStyle = STATUS_STYLES[prompt.status] ?? STATUS_STYLES.draft
                return (
                  <TableRow key={prompt.id}>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle.className}>
                        {statusStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <button
                        className="text-left hover:underline"
                        onClick={() => onViewDetail(prompt.id)}
                      >
                        {truncate(prompt.text, 50)}
                      </button>
                      {prompt.ai_generated && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">AI</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {TYPE_LABELS[prompt.type] ?? prompt.type}
                    </TableCell>
                    <TableCell className="text-gray-600 capitalize">
                      {DEPTH_LABELS[prompt.emotional_depth] ?? prompt.emotional_depth}
                    </TableCell>
                    <TableCell className={rateColor(prompt.completion_rate)}>
                      {prompt.completion_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className={rateColor(prompt.positive_response_rate)}>
                      {prompt.positive_response_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetail(prompt.id)}>
                            <Eye />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(prompt)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(prompt.status === 'draft' || prompt.status === 'testing') && (
                            <DropdownMenuItem onClick={() => onAction(prompt.id, 'promote')}>
                              <TrendingUp />
                              Promote
                            </DropdownMenuItem>
                          )}
                          {prompt.status !== 'flagged' && (
                            <DropdownMenuItem onClick={() => onAction(prompt.id, 'flag')}>
                              <Flag />
                              Flag
                            </DropdownMenuItem>
                          )}
                          {prompt.status === 'active' && (
                            <DropdownMenuItem onClick={() => onAction(prompt.id, 'retire')}>
                              <Archive />
                              Retire
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onAction(prompt.id, 'duplicate')}>
                            <Copy />
                            Duplicate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
              Previous
            </Button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
