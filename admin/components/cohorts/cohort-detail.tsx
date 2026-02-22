'use client'

import type { CohortDetail as CohortDetailType } from '@/lib/queries/cohorts'
import { useCohortDetail } from '@/hooks/useCohorts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar, Hash, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
  mature: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Mature' },
  graduated: { className: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Graduated' },
}

const CHURN_STYLES: Record<string, { className: string; label: string }> = {
  high: { className: 'bg-red-100 text-red-700 border-red-200', label: 'High' },
  medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
  low: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Low' },
}

const COUPLE_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
  churned: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Churned' },
  paused: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Paused' },
  deleted: { className: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Deleted' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '--'
  }
}

interface CohortDetailProps {
  cohortId: string
  onClose: () => void
}

export function CohortDetail({ cohortId, onClose }: CohortDetailProps) {
  const { data: detail, isLoading } = useCohortDetail(cohortId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading cohort details...
        </CardContent>
      </Card>
    )
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Cohort not found
        </CardContent>
      </Card>
    )
  }

  const statusStyle = STATUS_STYLES[detail.status] ?? STATUS_STYLES.active

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Cohort {detail.week}</CardTitle>
            <Badge variant="outline" className={statusStyle.className}>
              {statusStyle.label}
            </Badge>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Started {detail.startDate}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-3.5 w-3.5" />
            Week {detail.currentWeekNumber}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {detail.couplesCount} couples ({detail.activeCount} active)
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatBox label="WMEER" value={`${detail.wmeer.toFixed(1)}%`} />
          <StatBox label="W1 Retention" value={`${detail.w1Retention}%`} />
          <StatBox label="W4 Retention" value={`${detail.w4Retention}%`} />
          <StatBox label="W12 Retention" value={`${detail.w12Retention}%`} />
        </div>

        <Separator className="mb-6" />

        {/* Couples sub-table */}
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Couples in this cohort
        </h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completions</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Churn Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.couples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    No couples in this cohort
                  </TableCell>
                </TableRow>
              ) : (
                detail.couples.map((couple) => {
                  const coupleStatus = COUPLE_STATUS_STYLES[couple.status] ?? COUPLE_STATUS_STYLES.active
                  const churnStyle = couple.churnRiskLevel
                    ? CHURN_STYLES[couple.churnRiskLevel] ?? null
                    : null

                  return (
                    <TableRow key={couple.id}>
                      <TableCell className="max-w-[250px]">
                        <div className="text-sm">
                          {couple.memberEmails.length > 0
                            ? couple.memberEmails.join(', ')
                            : couple.id.slice(0, 12) + '...'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={coupleStatus.className}>
                          {coupleStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{couple.totalCompletions}</TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(couple.lastActiveAt)}
                      </TableCell>
                      <TableCell>
                        {churnStyle ? (
                          <Badge variant="outline" className={churnStyle.className}>
                            {churnStyle.label}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-gray-50 p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
