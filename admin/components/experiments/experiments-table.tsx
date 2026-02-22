'use client'

import { useMemo, useState } from 'react'
import type { ExperimentRow } from '@/lib/queries/experiments'
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  Square,
} from 'lucide-react'

const PAGE_SIZE = 15

type SortKey = 'name' | 'type' | 'status' | 'targetPercentage' | 'startedAt'
type SortDir = 'asc' | 'desc'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  running: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Running' },
  paused: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Paused' },
  draft: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
  completed: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completed' },
}

const TYPE_LABELS: Record<string, { className: string; label: string }> = {
  ab_test: { className: 'bg-purple-100 text-purple-800 border-purple-200', label: 'A/B Test' },
  feature_flag: { className: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Feature Flag' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type ExperimentAction = 'view_results' | 'pause' | 'resume' | 'end'

interface ExperimentsTableProps {
  experiments: ExperimentRow[]
  selectedId: string | null
  onSelectExperiment: (id: string) => void
  onAction: (id: string, action: ExperimentAction) => void
}

export function ExperimentsTable({
  experiments,
  selectedId,
  onSelectExperiment,
  onAction,
}: ExperimentsTableProps) {
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
    const items = [...experiments]
    items.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
    return items
  }, [experiments, sortKey, sortDir])

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
              <SortableHead label="Name" sortKeyName="name" />
              <SortableHead label="Type" sortKeyName="type" />
              <SortableHead label="Status" sortKeyName="status" />
              <SortableHead label="Started" sortKeyName="startedAt" />
              <SortableHead label="Target %" sortKeyName="targetPercentage" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No experiments found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((experiment) => {
                const statusStyle = STATUS_STYLES[experiment.status] ?? STATUS_STYLES.draft
                const typeStyle = TYPE_LABELS[experiment.type] ?? TYPE_LABELS.ab_test
                const isSelected = selectedId === experiment.id

                return (
                  <TableRow
                    key={experiment.id}
                    className={`cursor-pointer ${isSelected ? 'bg-orange-50' : ''}`}
                    onClick={() => onSelectExperiment(experiment.id)}
                  >
                    <TableCell className="font-medium max-w-[250px]">
                      <div>
                        <div className="truncate">{experiment.name}</div>
                        {experiment.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {experiment.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeStyle.className}>
                        {typeStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle.className}>
                        {statusStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(experiment.startedAt)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {experiment.targetPercentage}%
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onAction(experiment.id, 'view_results')
                            }}
                          >
                            <BarChart3 />
                            View Results
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {experiment.status === 'running' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onAction(experiment.id, 'pause')
                              }}
                            >
                              <Pause />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {(experiment.status === 'paused' || experiment.status === 'draft') && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onAction(experiment.id, 'resume')
                              }}
                            >
                              <Play />
                              {experiment.status === 'draft' ? 'Start' : 'Resume'}
                            </DropdownMenuItem>
                          )}
                          {experiment.status !== 'completed' && experiment.status !== 'draft' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onAction(experiment.id, 'end')
                              }}
                            >
                              <Square />
                              End Experiment
                            </DropdownMenuItem>
                          )}
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
