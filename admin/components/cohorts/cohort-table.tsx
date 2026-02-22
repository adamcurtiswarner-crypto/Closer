'use client'

import { useMemo, useState } from 'react'
import type { CohortRow } from '@/lib/queries/cohorts'
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
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 15

type SortKey = 'week' | 'couplesCount' | 'activeCount' | 'wmeer' | 'w1Retention' | 'w4Retention' | 'w12Retention'
type SortDir = 'asc' | 'desc'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
  mature: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Mature' },
  graduated: { className: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Graduated' },
}

function retentionColor(rate: number): string {
  if (rate >= 70) return 'text-green-600'
  if (rate >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

interface CohortTableProps {
  cohorts: CohortRow[]
  selectedId: string | null
  onSelectCohort: (id: string) => void
}

export function CohortTable({ cohorts, selectedId, onSelectCohort }: CohortTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('week')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    const items = [...cohorts]
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
  }, [cohorts, sortKey, sortDir])

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
              <SortableHead label="Cohort Week" sortKeyName="week" />
              <TableHead>Status</TableHead>
              <SortableHead label="Couples" sortKeyName="couplesCount" />
              <SortableHead label="Active" sortKeyName="activeCount" />
              <SortableHead label="WMEER %" sortKeyName="wmeer" />
              <SortableHead label="W1 Ret %" sortKeyName="w1Retention" />
              <SortableHead label="W4 Ret %" sortKeyName="w4Retention" />
              <SortableHead label="W12 Ret %" sortKeyName="w12Retention" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No cohorts found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cohort) => {
                const statusStyle = STATUS_STYLES[cohort.status] ?? STATUS_STYLES.active
                const isSelected = selectedId === cohort.id
                return (
                  <TableRow
                    key={cohort.id}
                    className={`cursor-pointer ${isSelected ? 'bg-orange-50' : ''}`}
                    onClick={() => onSelectCohort(cohort.id)}
                  >
                    <TableCell className="font-medium">{cohort.week}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle.className}>
                        {statusStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{cohort.couplesCount}</TableCell>
                    <TableCell>{cohort.activeCount}</TableCell>
                    <TableCell className={retentionColor(cohort.wmeer)}>
                      {cohort.wmeer.toFixed(1)}%
                    </TableCell>
                    <TableCell className={retentionColor(cohort.w1Retention)}>
                      {cohort.w1Retention}%
                    </TableCell>
                    <TableCell className={retentionColor(cohort.w4Retention)}>
                      {cohort.w4Retention}%
                    </TableCell>
                    <TableCell className={retentionColor(cohort.w12Retention)}>
                      {cohort.w12Retention}%
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
