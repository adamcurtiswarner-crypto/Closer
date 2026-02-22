'use client'

import { useExperimentDetail } from '@/hooks/useExperiments'
import type { ExperimentResults as ExperimentResultsType } from '@/lib/queries/experiments'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Users, TrendingUp, BarChart3 } from 'lucide-react'

const RECOMMENDATION_STYLES: Record<string, { className: string; label: string }> = {
  roll_out: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Roll Out' },
  keep_testing: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Keep Testing' },
  kill: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Kill' },
}

function VariantCard({
  label,
  name,
  metric,
  sampleSize,
  isWinner,
}: {
  label: string
  name: string
  metric: number
  sampleSize: number
  isWinner: boolean
}) {
  return (
    <div
      className={`flex-1 rounded-lg border p-4 ${
        isWinner ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold">{name}</div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Metric:</span>
          <span className="font-medium">{metric}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Sample size:</span>
          <span className="font-medium">{sampleSize.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function ResultsContent({ results }: { results: ExperimentResultsType }) {
  const recStyle = RECOMMENDATION_STYLES[results.recommendation] ?? RECOMMENDATION_STYLES.keep_testing
  const treatmentWins = results.treatment.metric > results.control.metric

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <VariantCard
          label="Control"
          name={results.control.name}
          metric={results.control.metric}
          sampleSize={results.control.sampleSize}
          isWinner={!treatmentWins}
        />
        <VariantCard
          label="Treatment"
          name={results.treatment.name}
          metric={results.treatment.metric}
          sampleSize={results.treatment.sampleSize}
          isWinner={treatmentWins}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          <div>
            <div className="text-sm text-gray-500">Statistical Significance</div>
            <div className="text-xl font-semibold">{results.significance}%</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Recommendation</div>
          <Badge variant="outline" className={recStyle.className}>
            {recStyle.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}

interface ExperimentResultsProps {
  experimentId: string
  onClose: () => void
}

export function ExperimentResults({ experimentId, onClose }: ExperimentResultsProps) {
  const { data: experiment, isLoading } = useExperimentDetail(experimentId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">
            {experiment?.name ?? 'Experiment Results'}
          </CardTitle>
          {experiment?.description && (
            <p className="text-sm text-gray-500 mt-1">{experiment.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading results...</div>
        ) : !experiment?.results ? (
          <div className="py-8 text-center text-gray-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No results yet. This experiment needs more data.</p>
            {experiment && (
              <div className="mt-3 text-xs text-gray-400">
                <span className="capitalize">{experiment.type.replace('_', ' ')}</span>
                {' -- '}
                Target: {experiment.targetPercentage}% of users
                {experiment.primaryMetric && ` -- Metric: ${experiment.primaryMetric}`}
              </div>
            )}
          </div>
        ) : (
          <ResultsContent results={experiment.results} />
        )}
      </CardContent>
    </Card>
  )
}
