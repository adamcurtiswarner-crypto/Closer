'use client'

import { usePromptDetail } from '@/hooks/usePrompts'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  testing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  retired: 'bg-gray-100 text-gray-500 border-gray-200',
  flagged: 'bg-red-100 text-red-700 border-red-200',
}

const TYPE_LABELS: Record<string, string> = {
  love_map_update: 'Love Map Update',
  conflict_navigation: 'Conflict Navigation',
  bid_for_connection: 'Bid for Connection',
  appreciation_expression: 'Appreciation Expression',
  dream_exploration: 'Dream Exploration',
  repair_attempt: 'Repair Attempt',
}

const RESEARCH_LABELS: Record<string, string> = {
  gottman_sound_house: 'Gottman Sound House',
  four_horsemen_prevention: 'Four Horsemen Prevention',
  repair_attempts: 'Repair Attempts',
  turning_toward: 'Turning Toward',
  original: 'Original',
}

function formatDate(iso: string | null) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function MetadataItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

interface PromptDetailModalProps {
  promptId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromptDetailModal({ promptId, open, onOpenChange }: PromptDetailModalProps) {
  const { data: prompt, isLoading } = usePromptDetail(promptId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prompt Details</DialogTitle>
          <DialogDescription>Full information and performance metrics</DialogDescription>
        </DialogHeader>

        {isLoading || !prompt ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-5">
            {/* Prompt text */}
            <div className="rounded-md bg-gray-50 p-4 text-sm leading-relaxed">
              {prompt.text}
            </div>
            {prompt.hint && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">Hint:</span> {prompt.hint}
              </p>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={STATUS_COLORS[prompt.status] ?? ''}>
                {prompt.status.charAt(0).toUpperCase() + prompt.status.slice(1)}
              </Badge>
              {prompt.ai_generated && (
                <Badge variant="secondary">AI Generated</Badge>
              )}
              {prompt.requires_conversation && (
                <Badge variant="outline">Requires Conversation</Badge>
              )}
            </div>

            <Separator />

            {/* Metadata grid */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Metadata</h3>
              <div className="grid grid-cols-3 gap-4">
                <MetadataItem label="Type" value={TYPE_LABELS[prompt.type] ?? prompt.type} />
                <MetadataItem label="Research Basis" value={RESEARCH_LABELS[prompt.research_basis] ?? prompt.research_basis} />
                <MetadataItem label="Emotional Depth" value={<span className="capitalize">{prompt.emotional_depth}</span>} />
                <MetadataItem label="Created by" value={prompt.created_by || '--'} />
                <MetadataItem label="Created at" value={formatDate(prompt.created_at)} />
                <MetadataItem label="Testing started" value={formatDate(prompt.testing_started_at)} />
              </div>
            </div>

            <Separator />

            {/* Performance section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <MetadataItem label="Times Assigned" value={prompt.times_assigned.toLocaleString()} />
                <MetadataItem label="Times Completed" value={prompt.times_completed.toLocaleString()} />
                <MetadataItem
                  label="Completion Rate"
                  value={
                    <span className={prompt.completion_rate >= 70 ? 'text-green-600' : prompt.completion_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                      {prompt.completion_rate.toFixed(1)}%
                    </span>
                  }
                />
                <MetadataItem
                  label="Positive Rate"
                  value={
                    <span className={prompt.positive_response_rate >= 70 ? 'text-green-600' : prompt.positive_response_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                      {prompt.positive_response_rate.toFixed(1)}%
                    </span>
                  }
                />
                <MetadataItem
                  label="Avg Response Length"
                  value={`${prompt.avg_response_length} chars`}
                />
              </div>
            </div>

            {/* Scheduling info if present */}
            {(prompt.week_restriction !== null || prompt.max_per_week !== null || prompt.day_preference !== null) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Scheduling</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <MetadataItem label="Week Restriction" value={prompt.week_restriction ?? '--'} />
                    <MetadataItem label="Max Per Week" value={prompt.max_per_week ?? '--'} />
                    <MetadataItem
                      label="Preferred Days"
                      value={
                        prompt.day_preference
                          ? prompt.day_preference.map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d] ?? d).join(', ')
                          : '--'
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
